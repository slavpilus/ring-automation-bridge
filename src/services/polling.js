import { getActiveDings } from '../clients/ring.js';
import { sendToN8n } from '../clients/webhook.js';
import { shouldSendEvent } from './deduplication.js';
import { info, debugLog } from '../utils/logger.js';
import { isEventExcluded } from '../utils/eventFilter.js';
import config from '../config/index.js';

// Function to directly poll for Ring events
export async function pollRingEvents(ringApi, locations) {
  try {
    // Try direct API call to get motion events
    const activeDings = await getActiveDings(ringApi);

    for (const ding of activeDings) {
      if (ding && (ding.kind === 'motion' || ding.kind === 'ding')) {
        info(
          `🚶 Motion/Ding detected via direct API polling: ${ding.kind} at device ${ding.doorbot_description}`,
        );

        const eventData = {
          id: ding.id_str || ding.id, // Use for deduplication
          deviceName: ding.doorbot_description,
          deviceId: ding.doorbot_id,
          kind: ding.kind,
          timestamp: new Date(ding.created_at || Date.now()).toISOString(),
          detectionMethod: 'direct_api_polling',
          dingData: ding,
        };

        const eventType = ding.kind === 'motion' ? 'motion_detected' : 'doorbell_press';
        // Check exclusion first, then deduplication
        if (!isEventExcluded(eventType) && shouldSendEvent(eventType, eventData)) {
          await sendToN8n(eventType, eventData).catch((err) =>
            debugLog(`Failed to send polled event: ${err.message}`),
          );
        }
      }
    }

    debugLog('Polling for Ring events...');

    for (const location of locations) {
      try {
        // Get the latest history events
        const historyEvents = await location.getHistory({ limit: 10 });

        if (historyEvents && historyEvents.length > 0) {
          // Log the raw history data to understand its structure
          debugLog(`Found ${historyEvents.length} history events for ${location.name}`);
          debugLog(`Raw history data sample: ${JSON.stringify(historyEvents[0])}`);

          // Process each event
          for (const event of historyEvents) {
            // Skip if event doesn't have required properties
            if (!event) {
              debugLog('Skipping null or undefined event');
              continue;
            }

            // Check if this is a valid event with the properties we need
            const hasValidProperties = event.id || event.ding_id_str || event.doorbot_id;
            if (!hasValidProperties) {
              debugLog(`Skipping event with insufficient properties: ${JSON.stringify(event)}`);
              continue;
            }

            // Determine event type based on kind
            let eventType = 'unknown_event';
            if (event.kind === 'motion') {
              eventType = 'motion_detected';
              info(
                `🚶 Motion detected at ${event.doorbot_description || 'unknown device'} (via history polling)!`,
              );
            } else if (event.kind === 'ding') {
              eventType = 'doorbell_press';
              info(
                `🔔 Doorbell press at ${event.doorbot_description || 'unknown device'} (via history polling)!`,
              );
            } else if (event.kind) {
              eventType = event.kind;
            }

            const eventData = {
              id: event.id,
              dingId: event.ding_id_str,
              deviceId: event.doorbot_id,
              locationName: location.name,
              deviceName: event.doorbot_description || 'unknown',
              kind: event.kind,
              createdAt: event.created_at,
              timestamp: new Date().toISOString(),
              detectionMethod: 'history_polling',
              eventData: event,
            };

            // Send to n8n with all possible ID fields for deduplication
            if (!isEventExcluded(eventType) && shouldSendEvent(eventType, eventData)) {
              await sendToN8n(eventType, eventData).catch((err) =>
                debugLog(`Failed to send polled event: ${err.message}`),
              );
            }
          }
        } else {
          debugLog(`No history events found for ${location.name}`);
        }

        // Also try to get the latest camera events specifically
        try {
          // Get cameras from the location's devices
          const devices = await location.getDevices();
          const cameras = devices.filter(
            (device) =>
              device.deviceType === 'doorbot' ||
              device.deviceType === 'floodlight_v2' ||
              device.deviceType === 'stickup_cam',
          );

          debugLog(`Found ${cameras.length} cameras in location ${location.name}`);

          for (const camera of cameras) {
            try {
              debugLog(`Checking camera: ${camera.name || camera.id}`);

              // Get the camera's health data which may contain motion information
              const health = await camera.getHealth();
              debugLog(`Camera health: ${JSON.stringify(health)}`);

              // Try to get the latest snapshot
              try {
                const snapshot = await camera.getSnapshot();
                if (snapshot) {
                  debugLog(`Got snapshot from ${camera.name || camera.id}`);
                }
              } catch (snapshotError) {
                debugLog(`Could not get snapshot: ${snapshotError.message}`);
              }

              // Try multiple methods to detect motion
              const hasMotion =
                camera.hasMotion ||
                (camera.data && camera.data.motion) ||
                (health && health.motion) ||
                camera.motion === true;

              if (hasMotion) {
                info(
                  `🚶 Motion detected at ${camera.name || camera.id} (via direct camera check)!`,
                );

                const eventData = {
                  id: `direct-motion-${camera.id}-${Date.now()}`,
                  cameraName: camera.name || camera.id,
                  cameraId: camera.id,
                  locationName: location.name,
                  timestamp: new Date().toISOString(),
                  detectionMethod: 'direct_camera_check',
                };

                // Send to n8n with ID for deduplication
                if (
                  !isEventExcluded('motion_detected') &&
                  shouldSendEvent('motion_detected', eventData)
                ) {
                  await sendToN8n('motion_detected', eventData).catch((err) =>
                    debugLog(`Failed to send direct motion event: ${err.message}`),
                  );
                }
              }

              // Also try to get the latest motion events directly
              try {
                const motionEvents = await camera.getEvents({ kind: 'motion' });
                if (motionEvents && motionEvents.length > 0) {
                  debugLog(
                    `Found ${motionEvents.length} motion events for ${camera.name || camera.id}`,
                  );

                  // Get the most recent motion event
                  const latestMotion = motionEvents[0];

                  info(`🚶 Motion detected at ${camera.name || camera.id} (via event history)!`);

                  const eventData = {
                    id: `event-motion-${camera.id}-${latestMotion.created_at || Date.now()}`,
                    cameraName: camera.name || camera.id,
                    cameraId: camera.id,
                    locationName: location.name,
                    timestamp: new Date().toISOString(),
                    eventCreatedAt: latestMotion.created_at,
                    detectionMethod: 'camera_events_history',
                  };

                  // Send to n8n with ID for deduplication
                  if (
                    !isEventExcluded('motion_detected') &&
                    shouldSendEvent('motion_detected', eventData)
                  ) {
                    await sendToN8n('motion_detected', eventData).catch((err) =>
                      debugLog(`Failed to send motion event from history: ${err.message}`),
                    );
                  }
                }
              } catch (eventsError) {
                debugLog(`Could not get camera events: ${eventsError.message}`);
              }
            } catch (cameraError) {
              debugLog(`Error checking camera ${camera.name}: ${cameraError.message}`);
            }
          }
        } catch (cameraError) {
          debugLog(`Error getting cameras for ${location.name}: ${cameraError.message}`);
        }
      } catch (err) {
        console.error(`Error polling events for ${location.name}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error in pollRingEvents: ${err.message}`);
  }
}

// Start polling for events
export function startPolling(ringApi, locations) {
  if (locations && locations.length > 0) {
    info(`🕐 Starting event polling every ${config.pollingInterval / 1000} seconds`);

    // Initial poll
    pollRingEvents(ringApi, locations);

    // Set up recurring polling
    return setInterval(() => {
      pollRingEvents(ringApi, locations).catch((err) =>
        console.error(`Polling error: ${err.message}`),
      );
    }, config.pollingInterval);
  } else {
    info('⚠️ Cannot start polling: No Ring locations found');
    return null;
  }
}

import { sendToN8n } from '../clients/webhook.js';
import { shouldSendEvent } from '../services/deduplication.js';
import { info, debugLog } from '../utils/logger.js';
import { isEventExcluded } from '../utils/eventFilter.js';

// Set up doorbell press handler
export function setupDoorbellHandler(camera: any, location: any): void {
  if (camera.isDoorbot && camera.onDoorbellPressed) {
    try {
      camera.onDoorbellPressed.subscribe(async (ding: any) => {
        info(`🔔 Doorbell pressed at ${camera.name}!`);

        const eventData = {
          cameraName: camera.name,
          cameraId: camera.id,
          locationName: location.name,
          batteryLevel: camera.batteryLevel,
          timestamp: new Date(ding.created_at).toISOString(),
          dingId: ding.id_str,
          kind: ding.kind,
          // Optional: include snapshot URL if available
          snapshotUrl: ding.snapshot_url,
        };

        if (
          !isEventExcluded('doorbell_pressed') &&
          shouldSendEvent('doorbell_pressed', eventData)
        ) {
          await sendToN8n('doorbell_pressed', eventData);
        }
      });
      info(`✅ Successfully subscribed to doorbell events for ${camera.name}`);
    } catch (error: any) {
      info(`⚠️ Could not subscribe to doorbell events for ${camera.name}: ${error.message}`);
    }
  } else if (camera.isDoorbot) {
    info(`⚠️ Doorbell ${camera.name} does not support onDoorbellPressed events`);
  }
}

// Set up motion detection handler
export function setupMotionHandler(camera: any, location: any): void {
  if (camera.onMotionDetected) {
    try {
      info(`🔍 Setting up motion detection for ${camera.name} (primary method)`);
      camera.onMotionDetected.subscribe(async (motionDetected: boolean) => {
        if (motionDetected) {
          info(`🚶 Motion detected at ${camera.name}!`);

          const eventData = {
            cameraName: camera.name,
            cameraId: camera.id,
            locationName: location.name,
            batteryLevel: camera.batteryLevel,
            timestamp: new Date().toISOString(),
            // Get the latest motion ding
            lastMotion: camera.lastMotion,
            detectionMethod: 'onMotionDetected',
          };

          if (
            !isEventExcluded('motion_detected') &&
            shouldSendEvent('motion_detected', eventData)
          ) {
            await sendToN8n('motion_detected', eventData);
          }
        }
      });
      info(`✅ Successfully subscribed to motion events for ${camera.name}`);
    } catch (error: any) {
      info(`⚠️ Could not subscribe to motion events for ${camera.name}: ${error.message}`);
    }
  } else {
    info(`⚠️ Camera ${camera.name} does not support onMotionDetected events`);
  }
}

// Set up active dings handler
export function setupActiveDingsHandler(camera: any, location: any): void {
  if (camera.onActiveDings) {
    try {
      info(`🔍 Setting up motion detection for ${camera.name} (ding events method)`);
      camera.onActiveDings.subscribe((dings: any[]) => {
        dings.forEach(async (ding: any) => {
          info(`🎯 Active event at ${camera.name}: ${ding.kind}`);

          // Create event data for the active ding
          const eventData = {
            cameraName: camera.name,
            cameraId: camera.id,
            locationName: location.name,
            dingId: ding.id_str,
            kind: ding.kind,
            timestamp: new Date(ding.created_at).toISOString(),
            // Optional: include snapshot URL if available
            snapshotUrl: ding.snapshot_url,
            detectionMethod: 'onActiveDings',
          };

          // Send as active_ding event
          if (!isEventExcluded('active_ding') && shouldSendEvent('active_ding', eventData)) {
            await sendToN8n('active_ding', eventData);
          }

          // If this is a motion event, also send as motion_detected for consistency
          if (ding.kind === 'motion' || ding.kind === 'motion_detected') {
            info(`🚶 Motion detected at ${camera.name} (via ding event)!`);
            if (
              !isEventExcluded('motion_detected') &&
              shouldSendEvent('motion_detected', {
                ...eventData,
                detectionMethod: 'onActiveDings_motion',
              })
            ) {
              await sendToN8n('motion_detected', {
                ...eventData,
                detectionMethod: 'onActiveDings_motion',
              });
            }
          }
        });
      });
      info(`✅ Successfully subscribed to active ding events for ${camera.name}`);
    } catch (error: any) {
      info(`⚠️ Could not subscribe to active ding events for ${camera.name}: ${error.message}`);
    }
  } else {
    info(`⚠️ Camera ${camera.name} does not support onActiveDings events`);
  }
}

// Set up data change handler (alternative motion detection)
export function setupDataHandler(camera: any, location: any): void {
  if (camera.onData) {
    try {
      info(`🔍 Setting up motion detection for ${camera.name} (alternative method)`);
      let lastMotionState = false;

      camera.onData.subscribe((data: any) => {
        debugLog(`Received data update for ${camera.name}: ${JSON.stringify(data)}`);

        // Check for motion in multiple ways
        const hasMotion =
          (data && data.motion === true) ||
          (data && data.motion_status === 'detected') ||
          (data && data.motion_detected === true) ||
          (data && data.motion_state === 'active');

        // Check if motion state has changed to active
        if (hasMotion && hasMotion !== lastMotionState) {
          info(`🚶 Motion detected at ${camera.name} (via data change)!`);

          lastMotionState = hasMotion;

          const eventData = {
            id: `motion-${camera.id}-${Date.now()}`, // Unique ID for deduplication
            cameraName: camera.name,
            cameraId: camera.id,
            locationName: location.name,
            batteryLevel: camera.batteryLevel,
            timestamp: new Date().toISOString(),
            detectionMethod: 'onData',
          };

          if (
            !isEventExcluded('motion_detected') &&
            shouldSendEvent('motion_detected', eventData)
          ) {
            sendToN8n('motion_detected', eventData).catch((err: any) =>
              console.error(`Error sending motion event: ${err.message}`),
            );
          }
        } else if (data && data.motion === false) {
          // Reset motion state when motion stops
          lastMotionState = false;
        }

        // Regular camera status updates (if not excluded)
        debugLog(`📊 Camera data updated for ${camera.name}`);
        // Send camera status updates to n8n
        const statusData = {
          cameraName: camera.name,
          cameraId: camera.id,
          locationName: location.name,
          batteryLevel: camera.batteryLevel,
          hasLight: camera.hasLight,
          hasSiren: camera.hasSiren,
          isOffline: camera.isOffline,
          isCharging: camera.isCharging,
          hasMotion: data && data.motion === true,
          timestamp: new Date().toISOString(),
        };

        if (
          !isEventExcluded('camera_status_update') &&
          shouldSendEvent('camera_status_update', statusData)
        ) {
          sendToN8n('camera_status_update', statusData).catch((err: any) =>
            console.error(`Error sending camera status update: ${err.message}`),
          );
        }
      });
      info(`✅ Successfully subscribed to data events for ${camera.name}`);
    } catch (error: any) {
      info(`⚠️ Could not subscribe to data events for ${camera.name}: ${error.message}`);
    }
  } else {
    info(`⚠️ Camera ${camera.name} does not support onData events`);
  }
}

// Set up all camera handlers
export function setupCameraHandlers(camera: any, location: any): void {
  info(`📷 Setting up camera: ${camera.name}`);

  setupDoorbellHandler(camera, location);
  setupMotionHandler(camera, location);
  setupActiveDingsHandler(camera, location);
  setupDataHandler(camera, location);
}

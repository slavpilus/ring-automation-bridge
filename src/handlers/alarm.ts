import { sendToN8n } from '../clients/webhook.js';
import { shouldSendEvent } from '../services/deduplication.js';
import { info, debugLog } from '../utils/logger.js';
import { isEventExcluded } from '../utils/eventFilter.js';

// Set up alarm mode change handler
export async function setupAlarmHandlers(location: any): Promise<void> {
  try {
    const devices = await location.getDevices();
    const alarmDevices = devices.filter((d: any) => d.deviceType === 'security-panel');

    if (alarmDevices.length > 0) {
      info(`🔒 Found ${alarmDevices.length} alarm device(s) at ${location.name}`);

      for (const alarm of alarmDevices) {
        info(`🔒 Setting up alarm device: ${alarm.name || alarm.id}`);

        if (alarm.onData) {
          try {
            // Store the initial alarm mode
            let previousMode = alarm.mode;
            debugLog(`Initial alarm mode for ${location.name}: ${previousMode || 'unknown'}`);

            // Send initial alarm mode state at startup
            const initialStateData = {
              locationName: location.name,
              alarmId: alarm.id,
              mode: alarm.mode,
              timestamp: new Date().toISOString(),
              initial: true,
            };

            if (
              !isEventExcluded('alarm_mode_state') &&
              shouldSendEvent('alarm_mode_state', initialStateData)
            ) {
              await sendToN8n('alarm_mode_state', initialStateData).catch((err: any) =>
                debugLog(`Failed to send initial alarm state: ${err.message}`),
              );
            }

            // Subscribe to alarm mode changes
            alarm.onData.subscribe(async (data: any) => {
              debugLog(`Alarm data update for ${location.name}: ${JSON.stringify(data)}`);

              // Check if mode property exists and has changed
              if (data && data.mode !== undefined && data.mode !== previousMode) {
                info(`🔔 Alarm mode changed from ${previousMode || 'unknown'} to ${data.mode}`);

                const eventData = {
                  locationName: location.name,
                  alarmId: alarm.id,
                  mode: data.mode,
                  previousMode: previousMode,
                  timestamp: new Date().toISOString(),
                };

                // Send the mode change event
                if (
                  !isEventExcluded('alarm_mode_changed') &&
                  shouldSendEvent('alarm_mode_changed', eventData)
                ) {
                  await sendToN8n('alarm_mode_changed', eventData);
                }

                // Update the previous mode for next comparison
                previousMode = data.mode;
              }
            });
            info('✅ Successfully subscribed to alarm mode changes');
          } catch (error: any) {
            info(`⚠️ Could not subscribe to alarm events: ${error.message}`);
          }
        } else {
          info('⚠️ Alarm device does not support onData events');
        }
      }
    } else {
      info(`ℹ️ No alarm devices found at ${location.name}`);
    }
  } catch (error: any) {
    info(`⚠️ Error accessing alarm devices: ${error.message}`);
  }
}

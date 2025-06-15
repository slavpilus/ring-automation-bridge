import { sendToN8n } from '../clients/webhook.js';
import { shouldSendEvent } from '../services/deduplication.js';
import { info } from '../utils/logger.js';
import { isEventExcluded } from '../utils/eventFilter.js';

// Process and report discovered devices
export async function processDiscoveredDevices(deviceData: any[]): Promise<void> {
  info('\n📱 Ring Devices Found:');
  info(`Total devices: ${deviceData?.length || 0}`);

  if (deviceData && deviceData.length > 0) {
    // Group devices by type
    const devicesByType: Record<string, any[]> = {};
    deviceData.forEach((device) => {
      const kind = device.kind || 'unknown';
      if (!devicesByType[kind]) devicesByType[kind] = [];
      devicesByType[kind].push(device);
    });

    // Print device types and counts
    Object.entries(devicesByType).forEach(([type, devices]) => {
      info(`${type}: ${devices.length}`);
    });

    // Print detailed device information
    for (const device of deviceData) {
      info(`\nDevice: ${device.description || 'Unknown'} (ID: ${device.id})`);
      info(`Type: ${device.kind || 'Unknown'}`);
      info(`Status: ${device.health_status || 'Unknown'}`);

      // Send device info to n8n
      try {
        const eventData = {
          id: device.id,
          description: device.description,
          kind: device.kind,
          health_status: device.health_status,
          battery_life: device.battery_life,
          firmware_version: device.firmware_version,
        };

        if (!isEventExcluded('device_found') && shouldSendEvent('device_found', eventData)) {
          await sendToN8n('device_found', eventData);
        }
      } catch (err: any) {
        console.error('Error sending device data to n8n:', err.message);
      }
    }

    // Check for base stations specifically
    const baseStations = deviceData.filter(
      (device) =>
        device.kind === 'base_station_v1' ||
        device.kind === 'base_station_v2' ||
        (device.kind && device.kind.includes('base_station')),
    );

    if (baseStations.length > 0) {
      info('\n🔒 Found Ring Alarm Base Station(s). Setting up direct monitoring.');

      for (const baseStation of baseStations) {
        info(`Base Station: ${baseStation.description || 'Unknown'} (ID: ${baseStation.id})`);
        info(
          `Location: ${baseStation.latitude || 'Unknown'}, ${baseStation.longitude || 'Unknown'}`,
        );
        info(`Time Zone: ${baseStation.time_zone || 'Unknown'}`);

        // Send base station info to n8n
        try {
          const eventData = {
            id: baseStation.id,
            description: baseStation.description,
            location_id: baseStation.location_id,
            device_id: baseStation.device_id,
            time_zone: baseStation.time_zone,
            latitude: baseStation.latitude,
            longitude: baseStation.longitude,
          };

          if (
            !isEventExcluded('base_station_found') &&
            shouldSendEvent('base_station_found', eventData)
          ) {
            await sendToN8n('base_station_found', eventData);
          }
        } catch (err: any) {
          console.error('Error sending base station data to n8n:', err.message);
        }
      }
    }

    // Work with cameras directly if available
    const doorbots = deviceData.filter(
      (device) =>
        (device.kind && device.kind.includes('doorbot')) ||
        (device.kind && device.kind.includes('doorbell')),
    );
    const stickupCams = deviceData.filter(
      (device) => device.kind && device.kind.includes('stickup_cam'),
    );
    const allCameras = [...doorbots, ...stickupCams];

    if (allCameras.length > 0) {
      info('\n📷 Found Ring Cameras. Setting up direct monitoring.');

      for (const camera of allCameras) {
        info(`Camera: ${camera.description || 'Unknown'} (ID: ${camera.id})`);
        info(`Type: ${camera.kind || 'Unknown'}`);
        info(`Status: ${camera.health_status || 'Unknown'}`);

        // Send camera info to n8n
        try {
          const eventData = {
            id: camera.id,
            description: camera.description,
            kind: camera.kind,
            health_status: camera.health_status,
            battery_life: camera.battery_life,
          };

          if (!isEventExcluded('camera_found') && shouldSendEvent('camera_found', eventData)) {
            await sendToN8n('camera_found', eventData);
          }
        } catch (err: any) {
          console.error('Error sending camera data to n8n:', err.message);
        }
      }
    }
  }

  info('\n👂 Listening for Ring events... (using direct device access)');
}

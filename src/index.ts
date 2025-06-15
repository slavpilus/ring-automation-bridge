import { validateConfig, logConfig } from './config/index.js';
import {
  createRingClient,
  testAuthentication,
  getAccountInfo,
  getLocations,
  getDevicesDirectly,
} from './clients/ring.js';
import { setupCameraHandlers } from './handlers/camera.js';
import { setupAlarmHandlers } from './handlers/alarm.js';
import { processDiscoveredDevices } from './handlers/devices.js';
import { startPolling } from './services/polling.js';
import { info, error } from './utils/logger.js';

// Main function to set up event listeners
async function setupRingListeners() {
  try {
    // Create Ring API client
    const ringApi = createRingClient();

    // Test authentication
    const isAuthenticated = await testAuthentication(ringApi);
    if (!isAuthenticated) {
      process.exit(1);
    }

    // Get account information
    await getAccountInfo(ringApi);

    // Get locations
    const locations = await getLocations(ringApi);

    if (locations.length === 0) {
      info('\n⚠️ No Ring locations found. Attempting to work with devices directly.');

      // Try to get raw devices list directly
      const deviceData = await getDevicesDirectly(ringApi);

      if (deviceData.length > 0) {
        await processDiscoveredDevices(deviceData);
      } else {
        info('\n⚠️ Could not retrieve any devices.');
        info('\n👂 Listening for Ring events... (waiting for locations to be added)');
      }

      return { ringApi, locations: [] };
    }

    // Set up listeners for each location
    for (const location of locations) {
      info(`📍 Setting up listeners for location: ${location.name}`);

      const cameras = location.cameras;

      // Set up camera handlers
      for (const camera of cameras) {
        setupCameraHandlers(camera, location);
      }

      // Set up alarm handlers
      await setupAlarmHandlers(location);
    }

    info('\n✅ All Ring listeners set up successfully!');
    info('👂 Listening for Ring events...');

    // Return the Ring API and locations for polling
    return {
      ringApi,
      locations,
    };
  } catch (err) {
    error(
      '❌ Error setting up Ring listeners:',
      err instanceof Error ? err : new Error(String(err)),
    );
    throw err;
  }
}

// Start the application
(async () => {
  try {
    // Log configuration
    logConfig();

    // Validate configuration
    if (!validateConfig()) {
      process.exit(1);
    }

    // Set up Ring API and listeners
    const ringData = await setupRingListeners();

    // Start polling for events
    const pollingInterval = startPolling(ringData.ringApi, ringData.locations);

    // Keep the process running
    process.on('SIGINT', () => {
      info('\n👋 Shutting down Ring webhook bridge...');

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      process.exit(0);
    });
  } catch (err: any) {
    error(`Error starting application: ${err?.message || 'Unknown error'}`);
    process.exit(1);
  }
})();

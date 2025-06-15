import { RingApi } from 'ring-client-api';
import config from '../config/index.js';
import { info, error, debugLog } from '../utils/logger.js';

// Initialize Ring API client
export function createRingClient() {
  return new RingApi({
    refreshToken: config.ring.refreshToken,
    // Disable push notifications to avoid PHONE_REGISTRATION_ERROR
    disablePushNotifications: true,
    controlCenterDisplayName: 'ring-n8n-webhook-bridge',
    // Add more options to help with reliability
    cameraStatusPollingSeconds: config.ring.cameraStatusPollingSeconds,
    locationModePollingSeconds: config.ring.locationModePollingSeconds,
    locationIds: config.ring.locationIds,
    retryCount: 5,
    debug: true,
  });
}

// Test Ring API authentication
export async function testAuthentication(ringApi) {
  try {
    // Use getAuth instead of refreshAuth to get the current auth status
    const authToken = await ringApi.restClient.getAuth();

    if (authToken && authToken.access_token) {
      info('\n✅ Successfully authenticated with Ring API');
      return true;
    } else {
      error('❌ Failed to authenticate with Ring API: No access token received');
      return false;
    }
  } catch (err) {
    error(`❌ Ring API authentication error: ${err.message}`);
    error('\n❌ Failed to authenticate with Ring API:', err.message);
    error('Please check your RING_REFRESH_TOKEN and generate a new one if needed.');
    error(
      'You can generate a new token using ring-auth-cli: https://github.com/dgreif/ring/tree/main/packages/ring-client-api#refresh-tokens',
    );
    return false;
  }
}

// Get account information
export async function getAccountInfo(ringApi) {
  try {
    const profile = await ringApi.getProfile();
    info('\n📋 Ring Account Information:');
    info(`User: ${profile.email} (${profile.first_name} ${profile.last_name})`);
    info(`Account ID: ${profile.user_id}`);
    info(`Account Status: ${profile.status}`);
    info(`Account Features: ${Object.keys(profile.features || {}).join(', ')}`);
    info(`Account Created: ${new Date(profile.created_at).toLocaleString()}\n`);
  } catch (err) {
    info('\n⚠️ Could not retrieve account profile information:', err.message);
  }
}

// Get Ring locations
export async function getLocations(ringApi) {
  try {
    info('🔄 Connecting to Ring API...');
    const locations = await ringApi.getLocations();
    info(`\n✅ Connected! Found ${locations.length} location(s)`);
    return locations;
  } catch (err) {
    error('❌ Error getting Ring locations:', err);
    throw err;
  }
}

// Get devices when no locations are found
export async function getDevicesDirectly(ringApi) {
  try {
    info('\n📱 Attempting to access Ring devices directly...');

    // Use the lower-level API to get device data
    const authData = await ringApi.restClient.getAuth();
    info(`Auth Status: ${authData ? 'Valid' : 'Invalid'}`);

    // Try multiple API endpoints to get device data
    let deviceData = [];

    try {
      // First try the main devices endpoint
      info('Fetching devices from main API endpoint...');
      deviceData = await ringApi.restClient.request({
        url: 'https://api.ring.com/clients_api/ring_devices',
        method: 'GET',
      });
    } catch (err) {
      debugLog(`Error fetching from main endpoint: ${err.message}`);
    }

    // If no devices found, try the v2 endpoint
    if (!deviceData || deviceData.length === 0) {
      try {
        info('No devices found. Trying v2 API endpoint...');
        const response = await ringApi.restClient.request({
          url: 'https://api.ring.com/devices/v2/devices',
          method: 'GET',
        });

        if (response && Array.isArray(response.devices)) {
          deviceData = response.devices;
        }
      } catch (err) {
        debugLog(`Error fetching from v2 endpoint: ${err.message}`);
      }
    }

    return deviceData || [];
  } catch (err) {
    error('\n⚠️ Could not retrieve or process raw devices list:', err.message);
    return [];
  }
}

// Try to get active dings via direct API call
export async function getActiveDings(ringApi) {
  try {
    const response = await ringApi.restClient.request({
      url: 'https://api.ring.com/clients_api/dings/active',
      method: 'GET',
    });

    if (response && Array.isArray(response)) {
      debugLog(`Found ${response.length} active dings via direct API call`);
      return response;
    }
    return [];
  } catch (err) {
    debugLog(`Error polling direct API for motion events: ${err.message}`);
    return [];
  }
}

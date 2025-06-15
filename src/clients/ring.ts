import { RingApi } from 'ring-client-api';
import config from '../config/index.js';
import { info, error, debugLog } from '../utils/logger.js';

// Initialize Ring API client
export function createRingClient(): RingApi {
  return new RingApi({
    refreshToken: config.ring.refreshToken,
    controlCenterDisplayName: 'ring-n8n-webhook-bridge',
    // Add more options to help with reliability
    cameraStatusPollingSeconds: config.ring.cameraStatusPollingSeconds,
    locationModePollingSeconds: config.ring.locationModePollingSeconds,
    locationIds: config.ring.locationIds,
    // Note: Some options may not be available in all versions
  } as any);
}

// Test Ring API authentication
export async function testAuthentication(ringApi: RingApi): Promise<boolean> {
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
  } catch (err: any) {
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
export async function getAccountInfo(ringApi: RingApi): Promise<void> {
  try {
    const profile = (await ringApi.getProfile()) as any;
    info('\n📋 Ring Account Information:');
    info(
      `User: ${profile.email || 'N/A'} (${profile.first_name || ''} ${profile.last_name || ''})`,
    );
    info(`Account ID: ${profile.user_id || 'N/A'}`);
    info(`Account Status: ${profile.status || 'N/A'}`);
    info(`Account Features: ${Object.keys(profile.features || {}).join(', ')}`);
    info(
      `Account Created: ${profile.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}\n`,
    );
  } catch (err: any) {
    info(`\n⚠️ Could not retrieve account profile information: ${err.message}`);
  }
}

// Get Ring locations
export async function getLocations(ringApi: RingApi) {
  try {
    info('🔄 Connecting to Ring API...');
    const locations = await ringApi.getLocations();
    info(`\n✅ Connected! Found ${locations.length} location(s)`);
    return locations;
  } catch (err: any) {
    error('❌ Error getting Ring locations:', err);
    throw err;
  }
}

// Get devices when no locations are found
export async function getDevicesDirectly(ringApi: RingApi): Promise<any[]> {
  try {
    info('\n📱 Attempting to access Ring devices directly...');

    // Use the lower-level API to get device data
    const authData = await ringApi.restClient.getAuth();
    info(`Auth Status: ${authData ? 'Valid' : 'Invalid'}`);

    // Try multiple API endpoints to get device data
    let deviceData: any[] = [];

    try {
      // First try the main devices endpoint
      info('Fetching devices from main API endpoint...');
      deviceData = await ringApi.restClient.request({
        url: 'https://api.ring.com/clients_api/ring_devices',
        method: 'GET',
      });
    } catch (err: any) {
      debugLog(`Error fetching from main endpoint: ${err.message}`);
    }

    // If no devices found, try the v2 endpoint
    if (!deviceData || deviceData.length === 0) {
      try {
        info('No devices found. Trying v2 API endpoint...');
        const response = (await ringApi.restClient.request({
          url: 'https://api.ring.com/devices/v2/devices',
          method: 'GET',
        })) as any;

        if (response && Array.isArray(response.devices)) {
          deviceData = response.devices;
        }
      } catch (err: any) {
        debugLog(`Error fetching from v2 endpoint: ${err.message}`);
      }
    }

    return deviceData || [];
  } catch (err: any) {
    error('\n⚠️ Could not retrieve or process raw devices list:', err.message);
    return [];
  }
}

// Try to get active dings via direct API call
export async function getActiveDings(ringApi: RingApi): Promise<any[]> {
  try {
    const response = await ringApi.restClient.request({
      url: 'https://api.ring.com/clients_api/dings/active',
      method: 'GET',
    });

    if (response && Array.isArray(response)) {
      debugLog(`Found ${(response as any[]).length} active dings via direct API call`);
      return response as any[];
    }
    return [];
  } catch (err: any) {
    debugLog(`Error polling direct API for motion events: ${err.message}`);
    return [];
  }
}

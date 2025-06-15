import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse location IDs if present
function parseLocationIds() {
  if (!process.env.RING_LOCATION_IDS) {
    return undefined;
  }

  // Check if the location IDs look valid (should be numbers)
  const rawIds = process.env.RING_LOCATION_IDS.split(',');
  const validIds = rawIds.filter((id) => !isNaN(id.trim()));

  if (validIds.length > 0) {
    console.log(
      `- RING_LOCATION_IDS: Using ${validIds.length} location ID(s): ${validIds.join(', ')}`,
    );
    return validIds;
  } else {
    console.log(
      `- RING_LOCATION_IDS: Value provided (${process.env.RING_LOCATION_IDS}) doesn't appear to be valid location IDs. Will monitor all locations.`,
    );
    return undefined;
  }
}

// Parse excluded events
function parseExcludedEvents() {
  return (process.env.EXCLUDED_EVENTS || '')
    .split(',')
    .map((event) => event.trim())
    .filter((event) => event.length > 0);
}

// Configuration object
const config = {
  // Debug mode
  debug: process.env.DEBUG === 'true',

  // Polling interval
  pollingInterval: process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 10000, // Default: 10 seconds

  // Excluded events
  excludedEvents: parseExcludedEvents(),

  // Ring configuration
  ring: {
    refreshToken: process.env.RING_REFRESH_TOKEN,
    locationIds: parseLocationIds(),
    cameraStatusPollingSeconds: 20,
    locationModePollingSeconds: 20,
  },

  // Webhook configuration
  webhook: {
    url: process.env.WEBHOOK_URL || process.env.N8N_WEBHOOK_URL, // Support both for backwards compatibility
    authHeader: process.env.WEBHOOK_AUTH_HEADER || process.env.N8N_AUTH_HEADER,
  },
};

// Validate required configuration
export function validateConfig() {
  const errors = [];

  if (!config.ring.refreshToken) {
    errors.push('RING_REFRESH_TOKEN is required but not set in .env file');
  }

  if (!config.webhook.url) {
    errors.push('WEBHOOK_URL is required but not set in .env file');
  }

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`❌ ${error}`));
    return false;
  }

  return true;
}

// Log configuration (without sensitive data)
export function logConfig() {
  console.log('\n📋 Environment Configuration:');
  console.log(
    `- RING_REFRESH_TOKEN: ${config.ring.refreshToken ? '✅ Set' : '❌ Missing (required)'}`,
  );
  console.log(
    `- RING_LOCATION_IDS: ${config.ring.locationIds ? config.ring.locationIds.join(', ') : '✅ Not set (monitoring all locations)'}`,
  );
  console.log(`- WEBHOOK_URL: ${config.webhook.url ? '✅ Set' : '❌ Missing (required)'}`);
  console.log(
    `- WEBHOOK_AUTH_HEADER: ${config.webhook.authHeader ? '✅ Set' : '✅ Not set (optional)'}`,
  );
  console.log(
    `- EXCLUDED_EVENTS: ${config.excludedEvents.length > 0 ? '🚫 ' + config.excludedEvents.join(', ') : '✅ None (all events will be sent)'}`,
  );
  console.log(`- DEBUG: ${config.debug ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`- POLLING_INTERVAL: ${config.pollingInterval / 1000} seconds`);
}

export default config;

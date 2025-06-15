import axios from 'axios';
import config from '../config/index.js';
import { info, error, debugLog } from '../utils/logger.js';
import { trackEvent } from '../utils/eventStats.js';

// Helper function to send webhook to n8n
export async function sendToN8n(eventType, data) {
  // Track received events
  trackEvent('received', eventType);
  debugLog(`Received ${eventType} event: ${JSON.stringify(data)}`);

  // Skip excluded event types
  if (config.excludedEvents.includes(eventType)) {
    trackEvent('blocked', eventType);
    debugLog(`Skipping excluded event type: ${eventType}`);
    return;
  }

  // Don't attempt to send if webhook URL is not configured
  if (!config.webhook.url) {
    error('❌ Cannot send event: WEBHOOK_URL is not configured');
    trackEvent('errors', eventType);
    return;
  }

  try {
    const payload = {
      timestamp: new Date().toISOString(),
      eventType,
      source: 'ring-doorbell',
      data,
    };

    const headers = {};
    if (config.webhook.authHeader) {
      headers['Authorization'] = config.webhook.authHeader;
    }

    debugLog(`Sending ${eventType} to webhook: ${config.webhook.url}`);
    const response = await axios.post(config.webhook.url, payload, { headers });
    info(`✅ Sent ${eventType} event to webhook`);
    trackEvent('sent', eventType);

    // Return response for chaining
    return response;
  } catch (err) {
    error(`❌ Failed to send ${eventType} to webhook: ${err.message}`);
    trackEvent('errors', eventType);

    // Add more detailed error information for debugging
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      debugLog(`Status: ${err.response.status}`);
      debugLog(`Headers: ${JSON.stringify(err.response.headers)}`);
      debugLog(`Data: ${JSON.stringify(err.response.data)}`);
    } else if (err.request) {
      // The request was made but no response was received
      debugLog('No response received. Is the webhook endpoint running?');
    }

    // Re-throw the error for the caller to handle if needed
    throw err;
  }
}

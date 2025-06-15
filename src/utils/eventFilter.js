import config from '../config/index.js';
import { debugLog } from './logger.js';
import { trackEvent } from './eventStats.js';

// Check if event type is excluded
export function isEventExcluded(eventType) {
  if (config.excludedEvents.includes(eventType)) {
    trackEvent('blocked', eventType);
    debugLog(`Event type ${eventType} is excluded from processing`);
    return true;
  }
  return false;
}

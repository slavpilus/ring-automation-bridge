import { debugLog } from '../utils/logger.js';
import { trackEvent } from '../utils/eventStats.js';
import type { EventType } from '../types/events.js';

// Store recent events to avoid duplicates
const recentEvents = new Map<string, number>();

// Cleanup old events periodically
setInterval(() => {
  const now = Date.now();
  const ttl = 60000; // 1 minute

  for (const [eventId, timestamp] of recentEvents.entries()) {
    if (now - timestamp > ttl) {
      recentEvents.delete(eventId);
    }
  }
}, 30000); // Clean up every 30 seconds

// Helper function to deduplicate events
export function isDuplicateEvent(eventId: string, ttlMs: number = 60000): boolean {
  // If no eventId provided, can't deduplicate
  if (!eventId) return false;

  const now = Date.now();
  const existing = recentEvents.get(eventId);

  if (existing && now - existing < ttlMs) {
    debugLog(`Duplicate event detected with ID: ${eventId}`);
    return true;
  }

  recentEvents.set(eventId, now);
  return false;
}

// Generate a consistent event ID from event data
export function generateEventId(eventType: EventType | string, data: Record<string, any>): string {
  // For motion events, try to extract a stable ID
  if (eventType === 'motion_detected') {
    // Try multiple possible ID sources in order of preference
    if (data.id) return `motion-${data.id}`;
    if (data.dingId) return `motion-${data.dingId}`;
    if (data.cameraId && data.timestamp) return `motion-${data.cameraId}-${data.timestamp}`;
    if (data.deviceId && data.timestamp) return `motion-${data.deviceId}-${data.timestamp}`;
    if (data.eventCreatedAt) return `motion-${data.cameraName}-${data.eventCreatedAt}`;

    // If data contains nested event data, try to extract ID from there
    if (data.eventData && data.eventData.id) return `motion-${data.eventData.id}`;
    if (data.dingData && data.dingData.id_str) return `motion-${data.dingData.id_str}`;

    // Last resort: use camera/device name and approximate time (rounded to nearest 5 seconds to avoid duplicates)
    const deviceName = data.cameraName || data.deviceName || 'unknown';
    const timeApprox = Math.floor(Date.now() / 5000) * 5000; // Round to nearest 5 seconds
    return `motion-${deviceName}-${timeApprox}`;
  }

  // For other event types
  if (data.id) return `${eventType}-${data.id}`;
  if (data.alarmId) return `${eventType}-${data.alarmId}`;

  // Generic fallback
  return `${eventType}-${JSON.stringify(data).slice(0, 50)}`;
}

// Check if event should be sent (not duplicate and not excluded)
export function shouldSendEvent(eventType: EventType | string, data: Record<string, any>): boolean {
  const eventId = generateEventId(eventType, data);

  if (isDuplicateEvent(eventId)) {
    console.log(`🔄 Skipping duplicate ${eventType} event with ID: ${eventId}`);
    trackEvent('blocked', `duplicate_${eventType}`);
    return false;
  }

  return true;
}

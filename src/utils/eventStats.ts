import type { EventStats } from '../types/events.js';

// Event tracking for debugging
export const eventStats: EventStats = {
  received: {},
  sent: {},
  blocked: {},
  errors: {},
};

// Update event statistics
export function trackEvent(type: keyof EventStats, eventType: string): void {
  eventStats[type][eventType] = (eventStats[type][eventType] || 0) + 1;
}

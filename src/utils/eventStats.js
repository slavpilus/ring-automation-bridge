// Event tracking for debugging
export const eventStats = {
  received: {},
  sent: {},
  blocked: {},
  errors: {},
};

// Update event statistics
export function trackEvent(type, eventType) {
  eventStats[type][eventType] = (eventStats[type][eventType] || 0) + 1;
}

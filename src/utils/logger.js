import config from '../config/index.js';

// Helper function to log debug information
export function debugLog(message) {
  if (config.debug) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Helper function to log info messages
export function info(message) {
  console.log(message);
}

// Helper function to log error messages
export function error(message, err = null) {
  if (err) {
    console.error(`${message}: ${err.message}`);
  } else {
    console.error(message);
  }
}

// Helper function to log warning messages
export function warn(message) {
  console.log(message);
}

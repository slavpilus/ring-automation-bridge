import config from '../config/index.js';

// Helper function to log debug information
export function debugLog(message: string): void {
  if (config.debug) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Helper function to log info messages
export function info(message: string): void {
  console.log(message);
}

// Helper function to log error messages
export function error(message: string, err?: Error | null): void {
  if (err) {
    console.error(`${message}: ${err.message}`);
  } else {
    console.error(message);
  }
}

// Helper function to log warning messages
export function warn(message: string): void {
  console.log(message);
}

/**
 * Frontend configuration utilities
 * These check environment variables that are exposed to the frontend
 */

/**
 * Check if Google OAuth is configured on the server
 * This is determined by checking if the connect button works
 * For simplicity, we always return true and let the server handle the validation
 */
export function isGoogleConfigured(): boolean {
  // The actual check happens on the server side
  // We return true here to show the UI, and the server will return an error
  // if it's not configured when the user tries to connect
  return true;
}

/**
 * Environment detection utilities for Spaceship app
 * Helps detect whether the app is running in Farcaster miniapp context or standard web browser
 */

/**
 * Check if the app is running in a Farcaster miniapp context
 * @returns true if running in Farcaster miniapp, false otherwise
 */
export function isFarcasterContext(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Farcaster-specific window objects or SDK presence
  // @ts-expect-error - Farcaster SDK may inject window.farcaster
  return !!(window.farcaster || window.parent !== window);
}

/**
 * Check if the app is running in a standard web browser (not in iframe/miniapp)
 * @returns true if running in standard browser, false otherwise
 */
export function isStandardBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return !isFarcasterContext();
}

/**
 * Get the current runtime environment
 * @returns 'farcaster' | 'browser' | 'server'
 */
export function getEnvironment(): 'farcaster' | 'browser' | 'server' {
  if (typeof window === 'undefined') return 'server';
  return isFarcasterContext() ? 'farcaster' : 'browser';
}

/**
 * Safely execute code only in Farcaster context
 * @param callback Function to execute if in Farcaster context
 */
export function runInFarcasterContext(callback: () => void): void {
  if (isFarcasterContext()) {
    callback();
  }
}

/**
 * Safely execute code only in browser context
 * @param callback Function to execute if in browser context
 */
export function runInBrowserContext(callback: () => void): void {
  if (isStandardBrowser()) {
    callback();
  }
}

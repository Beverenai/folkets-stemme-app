/**
 * iOS-style haptic feedback utilities
 * Uses the Vibration API where available
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 20],
  warning: [20, 30, 20],
  error: [30, 50, 30, 50, 30],
};

/**
 * Trigger haptic feedback
 * Falls back gracefully on devices without vibration support
 */
export function triggerHaptic(style: HapticStyle = 'medium'): void {
  // Check if vibration API is available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      const pattern = hapticPatterns[style];
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration is not supported
      console.debug('Haptic feedback not available:', e);
    }
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {
      // Silently fail
    }
  }
}

/**
 * Check if haptic feedback is available
 */
export function isHapticAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticStyle, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
};

export function triggerHaptic(style: HapticStyle = 'light'): void {
  // Check if Vibration API is supported
  if (!('vibrate' in navigator)) {
    return;
  }

  // Check user preference for reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  try {
    navigator.vibrate(hapticPatterns[style]);
  } catch (error) {
    // Silently fail if vibration is not allowed
    console.debug('Haptic feedback not available');
  }
}

// Convenience functions
export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};

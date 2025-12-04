import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseSwipeBackOptions {
  targetPath: string | number; // string for path, number for history (e.g., -1 for back)
  edgeThreshold?: number; // How far from left edge swipe must start (px)
  minSwipeDistance?: number; // Minimum distance to trigger navigation (px)
  enabled?: boolean;
}

export function useSwipeBack({
  targetPath,
  edgeThreshold = 30,
  minSwipeDistance = 80,
  enabled = true,
}: UseSwipeBackOptions) {
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      
      // Check if swipe started from left edge
      isEdgeSwipe.current = touch.clientX <= edgeThreshold;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe.current || touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Only trigger if horizontal swipe is dominant and long enough
      if (deltaX > minSwipeDistance && deltaX > deltaY * 2) {
        if (typeof targetPath === 'number') {
          navigate(targetPath as number);
        } else {
          navigate(targetPath as string);
        }
      }

      // Reset
      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, edgeThreshold, minSwipeDistance, navigate, targetPath]);
}

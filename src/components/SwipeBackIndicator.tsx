import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface SwipeBackIndicatorProps {
  showOnMount?: boolean;
  hideAfterMs?: number;
}

export default function SwipeBackIndicator({ 
  showOnMount = true, 
  hideAfterMs = 3000 
}: SwipeBackIndicatorProps) {
  const [visible, setVisible] = useState(showOnMount);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!showOnMount) return;

    // Check if user has seen the indicator before
    const hasSeen = sessionStorage.getItem('swipe-indicator-seen');
    if (hasSeen) {
      setVisible(false);
      return;
    }

    // Hide after delay
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('swipe-indicator-seen', 'true');
    }, hideAfterMs);

    // Hide on any touch interaction
    const handleTouch = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        setVisible(false);
        sessionStorage.setItem('swipe-indicator-seen', 'true');
      }
    };

    document.addEventListener('touchstart', handleTouch);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', handleTouch);
    };
  }, [showOnMount, hideAfterMs, hasInteracted]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="relative flex items-center">
        {/* Animated edge line */}
        <div className="w-1 h-24 bg-gradient-to-b from-transparent via-primary/60 to-transparent rounded-r animate-pulse" />
        
        {/* Animated chevron hint */}
        <div className="absolute left-0 flex items-center animate-swipe-hint">
          <div className="bg-primary/20 backdrop-blur-sm rounded-r-full pl-1 pr-2 py-3">
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

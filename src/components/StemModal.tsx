import { useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import SakSwipeView from './SakSwipeView';
import { triggerHaptic } from '@/lib/haptics';
import { Sak, PartiVote, RepresentantVote, VoteStats } from '@/types';

interface StemModalProps {
  isOpen: boolean;
  onClose: () => void;
  sak: Sak | null;
  isLoggedIn: boolean;
  userVote: string | null;
  voteStats: VoteStats;
  partiVotes?: PartiVote[];
  representantVotes?: RepresentantVote[];
  onVote: (vote: 'for' | 'mot' | 'avholdende') => Promise<void>;
  isSubmitting: boolean;
  onShare: () => void;
}

export default function StemModal({
  isOpen,
  onClose,
  sak,
  isLoggedIn,
  userVote,
  voteStats,
  partiVotes = [],
  representantVotes = [],
  onVote,
  isSubmitting,
  onShare,
}: StemModalProps) {
  const handleClose = useCallback(() => {
    triggerHaptic('light');
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      triggerHaptic('medium');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !sak) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 animate-modal-backdrop"
        onClick={handleClose}
      />
      
      {/* Back button - outside card */}
      <div className="relative z-50 safe-top px-4 pt-2">
        <button
          onClick={handleClose}
          className="flex items-center gap-1 text-primary ios-press"
          aria-label="Tilbake"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="text-base font-medium">Tilbake</span>
        </button>
      </div>
      
      {/* Modal card content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-2 pb-6 animate-card-slide-up">
        {/* Floating card with iOS-style layered shadows */}
        <div className="w-full max-w-[340px] h-[62vh] max-h-[520px] rounded-[28px] bg-card overflow-hidden border border-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.15),0_16px_32px_rgba(0,0,0,0.2),0_32px_64px_rgba(0,0,0,0.25)]">
          <SakSwipeView
            sak={sak}
            isLoggedIn={isLoggedIn}
            userVote={userVote}
            voteStats={voteStats}
            partiVotes={partiVotes}
            representantVotes={representantVotes}
            onVote={onVote}
            onShare={onShare}
          />
        </div>
      </div>
    </div>
  );
}

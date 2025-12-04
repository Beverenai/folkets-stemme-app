import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import SakSwipeView from './SakSwipeView';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { Json } from '@/integrations/supabase/types';

interface Forslagsstiller {
  navn: string;
  parti: string;
}

interface PartiVote {
  parti_forkortelse: string;
  parti_navn: string;
  stemmer_for: number;
  stemmer_mot: number;
  stemmer_avholdende: number;
}

interface RepresentantVote {
  id: string;
  stemme: string;
  representant: {
    id: string;
    fornavn: string;
    etternavn: string;
    parti_forkortelse: string | null;
    bilde_url: string | null;
  };
}

interface Sak {
  id: string;
  stortinget_id: string;
  tittel: string;
  kort_tittel: string | null;
  spoersmaal: string | null;
  kategori: string | null;
  oppsummering: string | null;
  beskrivelse: string | null;
  argumenter_for: Json;
  argumenter_mot: Json;
  stortinget_votering_for: number | null;
  stortinget_votering_mot: number | null;
  stortinget_votering_avholdende: number | null;
  komite_navn?: string | null;
  forslagsstiller?: Forslagsstiller[] | null;
  stengt_dato?: string | null;
}

interface StemModalProps {
  isOpen: boolean;
  onClose: () => void;
  sak: Sak | null;
  isLoggedIn: boolean;
  userVote: string | null;
  voteStats: {
    for: number;
    mot: number;
    avholdende: number;
    total: number;
  };
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
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 animate-modal-backdrop"
        onClick={handleClose}
      />
      
      {/* Modal content */}
      <div className={cn(
        "absolute inset-0 animate-modal-enter",
        "flex flex-col bg-background"
      )}>
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center ios-press hover:bg-secondary transition-colors"
          aria-label="Lukk"
        >
          <X className="h-5 w-5" />
        </button>

        {/* SakSwipeView */}
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
  );
}

import { useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-2 pt-4 pb-6 animate-card-slide-up">
        {/* Floating card - same size as StemKort */}
        <div className="w-[92%] max-h-[calc(100vh-180px)] rounded-[2.5rem] bg-card modal-card overflow-hidden">
          <SakSwipeView
            sak={sak}
            isLoggedIn={isLoggedIn}
            userVote={userVote}
            voteStats={voteStats}
            partiVotes={partiVotes}
            representantVotes={representantVotes}
            onVote={onVote}
            onShare={onShare}
            showDotsOutside={false}
          />
        </div>
      </div>
    </div>
  );
}

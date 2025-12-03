import { Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Share2, Check, X, Clock, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

interface PremiumCaseCardProps {
  id: string;
  tittel: string;
  kortTittel?: string | null;
  oppsummering?: string | null;
  kategori?: string | null;
  status: string;
  bildeUrl?: string | null;
  stengtDato?: string | null;
  vedtakResultat?: string | null;
  stortingetFor?: number | null;
  stortingetMot?: number | null;
  stortingetAvholdende?: number | null;
  folkeFor?: number;
  folkeMot?: number;
  folkeAvholdende?: number;
  userVote?: string | null;
  index?: number;
  variant?: 'featured' | 'card' | 'compact';
  onVoteUpdate?: () => void;
}

export default function PremiumCaseCard({
  id,
  tittel,
  kortTittel,
  oppsummering,
  kategori,
  status,
  bildeUrl,
  stengtDato,
  vedtakResultat,
  stortingetFor = 0,
  stortingetMot = 0,
  stortingetAvholdende = 0,
  folkeFor = 0,
  folkeMot = 0,
  folkeAvholdende = 0,
  userVote,
  index = 0,
  variant = 'card',
  onVoteUpdate
}: PremiumCaseCardProps) {
  const { user } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [currentVote, setCurrentVote] = useState(userVote);
  const [localFolkeFor, setLocalFolkeFor] = useState(folkeFor);
  const [localFolkeMot, setLocalFolkeMot] = useState(folkeMot);

  const displayTitle = kortTittel || tittel;
  const isCompleted = status === 'avsluttet';
  const totalStortinget = (stortingetFor || 0) + (stortingetMot || 0);
  const totalFolket = localFolkeFor + localFolkeMot + folkeAvholdende;
  
  const stortingetForPercent = totalStortinget > 0 ? Math.round(((stortingetFor || 0) / totalStortinget) * 100) : 0;
  const folkeForPercent = totalFolket > 0 ? Math.round((localFolkeFor / totalFolket) * 100) : 50;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const handleQuickVote = async (vote: 'for' | 'mot', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({ title: 'Logg inn for å stemme', variant: 'destructive' });
      return;
    }

    if (isVoting) return;
    setIsVoting(true);

    try {
      // Delete existing vote if any
      await supabase
        .from('folke_stemmer')
        .delete()
        .eq('user_id', user.id)
        .eq('sak_id', id);

      // Insert new vote
      const { error } = await supabase
        .from('folke_stemmer')
        .insert({ user_id: user.id, sak_id: id, stemme: vote });

      if (error) throw error;

      // Update local state
      if (currentVote === 'for') setLocalFolkeFor(prev => prev - 1);
      if (currentVote === 'mot') setLocalFolkeMot(prev => prev - 1);
      
      if (vote === 'for') setLocalFolkeFor(prev => prev + 1);
      if (vote === 'mot') setLocalFolkeMot(prev => prev + 1);
      
      setCurrentVote(vote);
      onVoteUpdate?.();
      
      toast({ title: vote === 'for' ? '👍 Du stemte for' : '👎 Du stemte mot' });
    } catch (error) {
      console.error('Vote error:', error);
      toast({ title: 'Kunne ikke registrere stemme', variant: 'destructive' });
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/sak/${id}`;
    const text = `Se hva folket mener om: ${displayTitle}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: displayTitle, text, url });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Lenke kopiert!' });
    }
  };

  const getVedtakBadge = () => {
    if (!isCompleted || !vedtakResultat) return null;
    
    if (vedtakResultat === 'vedtatt') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-vote-for/20 text-vote-for">
          <Check className="w-3 h-3" /> Vedtatt
        </span>
      );
    }
    if (vedtakResultat === 'ikke_vedtatt') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-vote-against/20 text-vote-against">
          <X className="w-3 h-3" /> Ikke vedtatt
        </span>
      );
    }
    return null;
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link
        to={`/sak/${id}`}
        className="flex items-center gap-3 p-3 ios-press transition-all"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-1">{displayTitle}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {kategori && (
              <span className="text-xs text-muted-foreground">{kategori}</span>
            )}
            {totalFolket > 0 && (
              <span className="text-xs text-primary">{folkeForPercent}% enig</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>
    );
  }

  // Featured variant (for carousel/home)
  if (variant === 'featured') {
    return (
      <Link
        to={`/sak/${id}`}
        className="block animate-ios-fade"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="relative rounded-2xl overflow-hidden ios-card ios-press">
          {/* Hero Image */}
          <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5">
            {bildeUrl ? (
              <img src={bildeUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-16 h-16 text-primary/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            
            {/* Status badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {kategori && (
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-card/80 backdrop-blur-sm">
                    {kategori}
                  </span>
                )}
                {isCompleted && stengtDato && (
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-card/80 backdrop-blur-sm text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Stengte {formatDate(stengtDato)}
                  </span>
                )}
              </div>
              {getVedtakBadge()}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">{displayTitle}</h3>
            
            {oppsummering && (
              <p className="text-sm text-muted-foreground line-clamp-2">{oppsummering}</p>
            )}

            {/* Quick vote buttons */}
            <div className="flex gap-2">
              <button
                onClick={(e) => handleQuickVote('for', e)}
                disabled={isVoting}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ios-press",
                  "flex items-center justify-center gap-2",
                  currentVote === 'for'
                    ? "bg-vote-for text-white"
                    : "bg-vote-for/10 text-vote-for hover:bg-vote-for/20"
                )}
              >
                <ThumbsUp className="w-4 h-4" />
                Enig
              </button>
              <button
                onClick={(e) => handleQuickVote('mot', e)}
                disabled={isVoting}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ios-press",
                  "flex items-center justify-center gap-2",
                  currentVote === 'mot'
                    ? "bg-vote-against text-white"
                    : "bg-vote-against/10 text-vote-against hover:bg-vote-against/20"
                )}
              >
                <ThumbsDown className="w-4 h-4" />
                Uenig
              </button>
            </div>

            {/* Results bar */}
            {totalFolket > 0 && (
              <div className="space-y-1.5">
                <div className="h-2 bg-secondary rounded-full overflow-hidden flex">
                  <div 
                    className="h-full bg-vote-for transition-all duration-500"
                    style={{ width: `${folkeForPercent}%` }}
                  />
                  <div 
                    className="h-full bg-vote-against transition-all duration-500"
                    style={{ width: `${100 - folkeForPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{folkeForPercent}% enig</span>
                  <span>{100 - folkeForPercent}% uenig</span>
                </div>
              </div>
            )}

            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-full py-2.5 rounded-xl border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/50 transition-colors ios-press"
            >
              <Share2 className="w-4 h-4" />
              Del resultat
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // Default card variant
  return (
    <Link
      to={`/sak/${id}`}
      className="block animate-ios-fade"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="ios-card rounded-2xl overflow-hidden ios-press">
        {/* Header with category and date */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {kategori && <span className="text-primary font-medium">{kategori}</span>}
            {kategori && (isCompleted || status) && <span>•</span>}
            {isCompleted && stengtDato ? (
              <span>Stengte {formatDate(stengtDato)}</span>
            ) : (
              <span className="text-vote-for">Pågående</span>
            )}
          </div>
          {getVedtakBadge()}
        </div>

        {/* Title and summary */}
        <div className="px-4 pb-3">
          <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1">{displayTitle}</h3>
          {oppsummering && (
            <p className="text-sm text-muted-foreground line-clamp-2">{oppsummering}</p>
          )}
        </div>

        {/* Quick vote buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={(e) => handleQuickVote('for', e)}
            disabled={isVoting}
            className={cn(
              "flex-1 py-2 rounded-xl font-medium text-sm transition-all ios-press",
              "flex items-center justify-center gap-1.5",
              currentVote === 'for'
                ? "bg-vote-for text-white"
                : "bg-vote-for/10 text-vote-for hover:bg-vote-for/20"
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            Enig
          </button>
          <button
            onClick={(e) => handleQuickVote('mot', e)}
            disabled={isVoting}
            className={cn(
              "flex-1 py-2 rounded-xl font-medium text-sm transition-all ios-press",
              "flex items-center justify-center gap-1.5",
              currentVote === 'mot'
                ? "bg-vote-against text-white"
                : "bg-vote-against/10 text-vote-against hover:bg-vote-against/20"
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            Uenig
          </button>
        </div>

        {/* Results bar */}
        <div className="px-4 pb-3 space-y-1">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-vote-for transition-all duration-500"
              style={{ width: `${folkeForPercent}%` }}
            />
            <div 
              className="h-full bg-vote-against transition-all duration-500"
              style={{ width: `${100 - folkeForPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{localFolkeFor} enig</span>
            <span>{localFolkeMot} uenig</span>
          </div>
        </div>

        {/* Footer with share */}
        <div className="px-4 pb-3">
          <button
            onClick={handleShare}
            className="w-full py-2 rounded-xl border border-border/50 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-secondary/50 transition-colors ios-press"
          >
            <Share2 className="w-3.5 h-3.5" />
            Del resultat
          </button>
        </div>
      </div>
    </Link>
  );
}

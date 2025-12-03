import { Link } from 'react-router-dom';
import { ChevronRight, Clock, CheckCircle, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from './ResultBar';
import KategoriBadge from './KategoriBadge';

interface VoteringCardProps {
  id: string;
  forslagTekst: string | null;
  oppsummering: string | null;
  status: string;
  voteringDato: string | null;
  resultatFor: number;
  resultatMot: number;
  resultatAvholdende: number;
  folkeFor?: number;
  folkeMot?: number;
  folkeAvholdende?: number;
  userVote?: string | null;
  vedtatt?: boolean | null;
  sakTittel?: string | null;
  stortingetId?: string | null;
  kategori?: string | null;
  variant?: 'default' | 'compact' | 'featured';
  index?: number;
}

export default function VoteringCard({
  id,
  forslagTekst,
  oppsummering,
  status,
  voteringDato,
  resultatFor,
  resultatMot,
  resultatAvholdende,
  folkeFor = 0,
  folkeMot = 0,
  folkeAvholdende = 0,
  userVote,
  vedtatt,
  sakTittel,
  stortingetId,
  kategori,
  variant = 'default',
  index = 0,
}: VoteringCardProps) {
  const isAvsluttet = status === 'avsluttet';
  const hasStortingetResults = resultatFor > 0 || resultatMot > 0;
  const hasFolkeResults = folkeFor > 0 || folkeMot > 0 || folkeAvholdende > 0;
  const totalFolke = folkeFor + folkeMot + folkeAvholdende;

  const displayText = oppsummering || forslagTekst || sakTittel || 'Votering';

  if (variant === 'compact') {
    return (
      <Link 
        to={`/votering/${id}`}
        className="flex items-center gap-3 p-4 ios-press hover:bg-secondary/50 transition-colors"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[15px] line-clamp-2">{displayText}</p>
          {hasFolkeResults && (
            <div className="flex items-center gap-2 mt-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{totalFolke} stemmer</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2 py-1 rounded-full text-[10px] font-medium',
            isAvsluttet ? 'bg-secondary text-secondary-foreground' : 'bg-vote-for/20 text-vote-for'
          )}>
            {isAvsluttet ? 'Avsluttet' : 'Aktiv'}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link 
        to={`/votering/${id}`}
        className="premium-card-glow p-5 block ios-press animate-ios-slide-up"
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {kategori && <KategoriBadge kategori={kategori} size="sm" />}
          <span className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
            isAvsluttet 
              ? 'bg-secondary text-secondary-foreground' 
              : 'bg-vote-for/20 text-vote-for'
          )}>
            {isAvsluttet ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {isAvsluttet ? 'Avsluttet' : 'Pågående'}
          </span>
          {vedtatt !== null && vedtatt !== undefined && (
            <span className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium',
              vedtatt ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
            )}>
              {vedtatt ? 'Vedtatt' : 'Ikke vedtatt'}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-lg leading-snug mb-3 line-clamp-3">
          {displayText}
        </h3>

        {/* Folkets resultat */}
        {hasFolkeResults && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Folket ({totalFolke} stemmer)
              </span>
            </div>
            <ResultBar 
              forCount={folkeFor}
              motCount={folkeMot}
              avholdendeCount={folkeAvholdende}
              size="sm"
              animated
            />
          </div>
        )}

        {/* Stortingets resultat */}
        {hasStortingetResults && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Stortinget</p>
            <ResultBar 
              forCount={resultatFor}
              motCount={resultatMot}
              avholdendeCount={resultatAvholdende}
              size="sm"
            />
          </div>
        )}

        {userVote && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Din stemme: <span className={cn(
                'font-medium',
                userVote === 'for' && 'text-vote-for',
                userVote === 'mot' && 'text-vote-mot',
                userVote === 'avholdende' && 'text-vote-avholdende'
              )}>
                {userVote === 'for' ? 'For' : userVote === 'mot' ? 'Mot' : 'Avstår'}
              </span>
            </span>
          </div>
        )}
      </Link>
    );
  }

  // Default card
  return (
    <Link 
      to={`/votering/${id}`}
      className="premium-card p-4 block ios-press animate-ios-slide-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[15px] leading-snug line-clamp-2">
            {displayText}
          </p>
        </div>
        <span className={cn(
          'shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium',
          isAvsluttet 
            ? 'bg-secondary text-secondary-foreground' 
            : 'bg-vote-for/20 text-vote-for'
        )}>
          {isAvsluttet ? 'Avsluttet' : 'Aktiv'}
        </span>
      </div>

      {hasFolkeResults && (
        <div className="mb-2">
          <ResultBar 
            forCount={folkeFor}
            motCount={folkeMot}
            avholdendeCount={folkeAvholdende}
            size="sm"
          />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {totalFolke} stemmer
        </span>
        {hasStortingetResults && (
          <span>{resultatFor} for, {resultatMot} mot</span>
        )}
      </div>
    </Link>
  );
}

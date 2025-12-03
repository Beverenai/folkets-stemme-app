import { Link } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResultBar from './ResultBar';

interface CaseCardProps {
  id: string;
  tittel: string;
  kortTittel?: string | null;
  oppsummering?: string | null;
  kategori?: string | null;
  status: string;
  bildeUrl?: string | null;
  forCount: number;
  motCount: number;
  avholdendeCount: number;
  index?: number;
  variant?: 'default' | 'compact' | 'featured';
}

export default function CaseCard({
  id,
  tittel,
  kortTittel,
  oppsummering,
  kategori,
  status,
  bildeUrl,
  forCount,
  motCount,
  avholdendeCount,
  index = 0,
  variant = 'default'
}: CaseCardProps) {
  const totalVotes = forCount + motCount + avholdendeCount;
  const isAvsluttet = status === 'avsluttet';

  if (variant === 'featured') {
    return (
      <Link
        to={`/sak/${id}`}
        className="block premium-card overflow-hidden ios-press animate-ios-slide-up"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        {/* Hero image or gradient */}
        <div className="relative h-48 bg-gradient-to-br from-primary/30 via-primary/10 to-background">
          {bildeUrl ? (
            <img 
              src={bildeUrl} 
              alt={tittel} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-20">🏛️</div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          
          {/* Status badge */}
          <div className="absolute top-4 left-4">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm',
              isAvsluttet 
                ? 'bg-secondary/80 text-secondary-foreground' 
                : 'bg-vote-for/20 text-vote-for'
            )}>
              {isAvsluttet ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {isAvsluttet ? 'Avsluttet' : 'Pågående'}
            </span>
          </div>
          
          {/* Category */}
          {kategori && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-background/80 backdrop-blur-sm">
                {kategori}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 -mt-12 relative">
          <h3 className="font-bold text-lg mb-2 line-clamp-2">
            {kortTittel || tittel}
          </h3>
          
          {oppsummering && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {oppsummering}
            </p>
          )}

          {/* Vote stats */}
          <div className="space-y-3">
            <ResultBar 
              forCount={forCount}
              motCount={motCount}
              avholdendeCount={avholdendeCount}
              size="md"
            />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{totalVotes} stemmer</span>
              </div>
              <span className="text-primary font-medium flex items-center gap-1">
                Se sak <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/sak/${id}`}
        className="flex items-center gap-4 p-4 ios-touch animate-ios-slide-up"
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
          index % 4 === 0 ? 'bg-primary/15' : 
          index % 4 === 1 ? 'bg-vote-for/15' :
          index % 4 === 2 ? 'bg-ios-orange/15' : 'bg-ios-purple/15'
        )}>
          <span className="text-xl">🏛️</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[15px] truncate mb-1">
            {kortTittel || tittel}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className={cn(
              'flex items-center gap-1',
              isAvsluttet ? 'text-muted-foreground' : 'text-vote-for'
            )}>
              {isAvsluttet ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {isAvsluttet ? 'Avsluttet' : 'Pågående'}
            </span>
            {totalVotes > 0 && (
              <span>{totalVotes} stemmer</span>
            )}
          </div>
        </div>
        
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      to={`/sak/${id}`}
      className="block premium-card p-4 ios-press animate-ios-slide-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
          index % 4 === 0 ? 'bg-primary/15' : 
          index % 4 === 1 ? 'bg-vote-for/15' :
          index % 4 === 2 ? 'bg-ios-orange/15' : 'bg-ios-purple/15'
        )}>
          <span className="text-xl">🏛️</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              isAvsluttet ? 'text-muted-foreground' : 'text-vote-for'
            )}>
              {isAvsluttet ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {isAvsluttet ? 'Avsluttet' : 'Pågående'}
            </span>
            {kategori && (
              <span className="text-xs text-muted-foreground">• {kategori}</span>
            )}
          </div>
          
          <h3 className="font-semibold text-[15px] mb-2 line-clamp-2">
            {kortTittel || tittel}
          </h3>
          
          {oppsummering && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {oppsummering}
            </p>
          )}

          {/* Mini vote bar */}
          {totalVotes > 0 && (
            <div className="space-y-2">
              <ResultBar 
                forCount={forCount}
                motCount={motCount}
                avholdendeCount={avholdendeCount}
                size="sm"
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{totalVotes} stemmer</span>
              </div>
            </div>
          )}
        </div>
        
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}
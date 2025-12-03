import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArgumentsSlideProps {
  argumenterFor: string[];
  argumenterMot: string[];
}

export default function ArgumentsSlide({ argumenterFor, argumenterMot }: ArgumentsSlideProps) {
  const totalArguments = argumenterFor.length + argumenterMot.length;
  const hasArguments = totalArguments > 0;

  return (
    <div className="h-full flex flex-col px-4 pt-6 pb-20 overflow-hidden">
      <h2 className="text-xl font-bold text-primary mb-2">Argumenter</h2>
      <p className="text-sm text-muted-foreground mb-4">
        For- og motargumenter hentet fra Stortingets dokumenter.
      </p>
      
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-vote-for rounded-full w-full" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-vote-for font-medium">
          <Check className="h-3.5 w-3.5" />
          <span>Alle argumenter</span>
        </div>
      </div>

      {hasArguments ? (
        <div className="flex-1 overflow-y-auto space-y-5 -mx-4 px-4">
          {/* Arguments For */}
          {argumenterFor.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-vote-for/20 flex items-center justify-center">
                  <ThumbsUp className="h-3.5 w-3.5 text-vote-for" />
                </div>
                <span className="font-semibold text-sm">Argumenter for</span>
              </div>
              <div className="premium-card divide-y divide-border/50">
                {argumenterFor.map((arg, i) => (
                  <p key={i} className="px-4 py-3.5 text-sm leading-relaxed text-foreground/90">
                    {arg}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Arguments Against */}
          {argumenterMot.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-vote-mot/20 flex items-center justify-center">
                  <ThumbsDown className="h-3.5 w-3.5 text-vote-mot" />
                </div>
                <span className="font-semibold text-sm">Argumenter mot</span>
              </div>
              <div className="premium-card divide-y divide-border/50">
                {argumenterMot.map((arg, i) => (
                  <p key={i} className="px-4 py-3.5 text-sm leading-relaxed text-foreground/90">
                    {arg}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Ingen argumenter tilgjengelig for denne saken.
          </p>
        </div>
      )}
    </div>
  );
}

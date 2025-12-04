import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArgumentsSlideProps {
  argumenterFor: string[];
  argumenterMot: string[];
}

export default function ArgumentsSlide({ argumenterFor, argumenterMot }: ArgumentsSlideProps) {
  const hasArguments = argumenterFor.length > 0 || argumenterMot.length > 0;

  return (
    <div className="h-full flex flex-col px-4 pt-5 pb-8">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-1">For og mot</h2>
        <p className="text-xs text-muted-foreground">
          Argumenter fra Stortingets dokumenter
        </p>
      </div>

      {hasArguments ? (
        <div className="relative flex-1 min-h-0">
          {/* Scrollable content */}
          <div className="h-full overflow-y-auto space-y-4 ios-scroll pb-4">
            {/* Arguments For */}
            {argumenterFor.length > 0 && (
              <div className="rounded-2xl bg-vote-for/5 border border-vote-for/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-vote-for/10 border-b border-vote-for/20">
                  <ThumbsUp className="h-4 w-4 text-vote-for" />
                  <span className="text-sm font-semibold text-vote-for">For ({argumenterFor.length})</span>
                </div>
                <div className="divide-y divide-vote-for/10">
                  {argumenterFor.map((arg, i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      <span className="text-xs font-bold text-vote-for/60 mt-0.5">{i + 1}</span>
                      <p className="text-[13px] leading-relaxed text-foreground/90 flex-1">
                        {arg}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arguments Against */}
            {argumenterMot.length > 0 && (
              <div className="rounded-2xl bg-vote-mot/5 border border-vote-mot/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-vote-mot/10 border-b border-vote-mot/20">
                  <ThumbsDown className="h-4 w-4 text-vote-mot" />
                  <span className="text-sm font-semibold text-vote-mot">Mot ({argumenterMot.length})</span>
                </div>
                <div className="divide-y divide-vote-mot/10">
                  {argumenterMot.map((arg, i) => (
                    <p key={i} className="px-4 py-3 flex gap-3">
                      <span className="text-xs font-bold text-vote-mot/60 mt-0.5">{i + 1}</span>
                      <span className="text-[13px] leading-relaxed text-foreground/90 flex-1">
                        {arg}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom fade gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Ingen argumenter tilgjengelig
            </p>
          </div>
        </div>
      )}

      {/* AI Disclaimer */}
      <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
        AI-genererte argumenter basert på saksdokumenter
      </p>
    </div>
  );
}
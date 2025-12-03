import { useState, useEffect } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArgumentsSectionProps {
  argumenterFor: string[];
  argumenterMot: string[];
  onReadComplete?: () => void;
}

export default function ArgumentsSection({ argumenterFor, argumenterMot, onReadComplete }: ArgumentsSectionProps) {
  const [expandedFor, setExpandedFor] = useState<number[]>([]);
  const [expandedMot, setExpandedMot] = useState<number[]>([]);
  const [readProgress, setReadProgress] = useState(0);

  const totalArguments = argumenterFor.length + argumenterMot.length;
  const readArguments = expandedFor.length + expandedMot.length;

  useEffect(() => {
    if (totalArguments > 0) {
      const progress = (readArguments / totalArguments) * 100;
      setReadProgress(progress);
      
      if (progress >= 100 && onReadComplete) {
        onReadComplete();
      }
    }
  }, [readArguments, totalArguments, onReadComplete]);

  const toggleFor = (index: number) => {
    setExpandedFor(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleMot = (index: number) => {
    setExpandedMot(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  if (totalArguments === 0) {
    return null;
  }

  return (
    <div className="space-y-4 animate-ios-slide-up">
      {/* Header */}
      <div className="px-1">
        <h3 className="text-lg font-semibold mb-2">Argumenter</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Les argumentene for å forstå saken bedre
        </p>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Lesefremdrift</span>
            <span>{Math.round(readProgress)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${readProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Arguments For */}
      {argumenterFor.length > 0 && (
        <div className="premium-card">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <div className="h-8 w-8 rounded-full bg-vote-for/20 flex items-center justify-center">
              <Check className="h-4 w-4 text-vote-for" />
            </div>
            <span className="font-semibold text-vote-for">Argumenter for</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {expandedFor.length}/{argumenterFor.length} lest
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {argumenterFor.map((arg, index) => {
              const isExpanded = expandedFor.includes(index);
              const isRead = isExpanded;
              
              return (
                <button
                  key={index}
                  onClick={() => toggleFor(index)}
                  className={cn(
                    'w-full px-4 py-4 text-left transition-all duration-200 ios-touch',
                    isExpanded ? 'bg-vote-for/5' : 'hover:bg-secondary/30',
                    isRead && !isExpanded && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                      isRead ? 'border-vote-for bg-vote-for' : 'border-muted-foreground/30'
                    )}>
                      {isRead && <Check className="h-3 w-3 text-vote-for-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-relaxed transition-all',
                        isExpanded ? 'text-foreground' : 'line-clamp-2 text-muted-foreground'
                      )}>
                        {arg}
                      </p>
                    </div>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Arguments Against */}
      {argumenterMot.length > 0 && (
        <div className="premium-card">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <div className="h-8 w-8 rounded-full bg-vote-mot/20 flex items-center justify-center">
              <X className="h-4 w-4 text-vote-mot" />
            </div>
            <span className="font-semibold text-vote-mot">Argumenter mot</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {expandedMot.length}/{argumenterMot.length} lest
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {argumenterMot.map((arg, index) => {
              const isExpanded = expandedMot.includes(index);
              const isRead = isExpanded;
              
              return (
                <button
                  key={index}
                  onClick={() => toggleMot(index)}
                  className={cn(
                    'w-full px-4 py-4 text-left transition-all duration-200 ios-touch',
                    isExpanded ? 'bg-vote-mot/5' : 'hover:bg-secondary/30',
                    isRead && !isExpanded && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                      isRead ? 'border-vote-mot bg-vote-mot' : 'border-muted-foreground/30'
                    )}>
                      {isRead && <Check className="h-3 w-3 text-vote-mot-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm leading-relaxed transition-all',
                        isExpanded ? 'text-foreground' : 'line-clamp-2 text-muted-foreground'
                      )}>
                        {arg}
                      </p>
                    </div>
                    <ChevronDown className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform flex-shrink-0',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
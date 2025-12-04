import { cn } from '@/lib/utils';
import { FileText, Users, Vote } from 'lucide-react';

interface ProsessIndikatorProps {
  steg: number; // 1 = Forslag, 2 = Komité, 3 = Votering
  variant?: 'full' | 'compact';
}

const steps = [
  { id: 1, label: 'Forslag', icon: FileText },
  { id: 2, label: 'Komité', icon: Users },
  { id: 3, label: 'Votering', icon: Vote },
];

export default function ProsessIndikator({ steg, variant = 'full' }: ProsessIndikatorProps) {
  if (variant === 'compact') {
    const currentStep = steps.find(s => s.id === steg) || steps[0];
    return (
      <span className="text-xs text-muted-foreground">
        {currentStep.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const isActive = step.id === steg;
        const isCompleted = step.id < steg;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-primary/20 text-primary',
                  !isActive && !isCompleted && 'bg-secondary text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium',
                  isActive && 'text-primary',
                  isCompleted && 'text-primary/70',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-6 h-0.5 mx-0.5 -mt-4',
                  isCompleted ? 'bg-primary/40' : 'bg-secondary'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
import { cn } from '@/lib/utils';

interface OnboardingStepProps {
  title: string;
  description: string;
  icon: string;
  illustration?: React.ReactNode;
  className?: string;
}

export default function OnboardingStep({ 
  title, 
  description, 
  icon,
  illustration,
  className 
}: OnboardingStepProps) {
  return (
    <div className={cn('flex flex-col items-center text-center px-8', className)}>
      {/* Icon/Illustration */}
      <div className="mb-8">
        {illustration || (
          <div className="h-32 w-32 rounded-full bg-nrk-primary/10 flex items-center justify-center animate-float">
            <span className="text-6xl">{icon}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold mb-4 gradient-text">{title}</h2>

      {/* Description */}
      <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
        {description}
      </p>
    </div>
  );
}

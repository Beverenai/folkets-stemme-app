import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import OnboardingStep from '@/components/OnboardingStep';

const ONBOARDING_KEY = 'hasCompletedOnboarding';

const steps = [
  {
    icon: '🗳️',
    title: 'Stem som folket',
    description: 'Se de samme sakene som politikerne på Stortinget stemmer over, og gi din stemme. Din mening teller!',
  },
  {
    icon: '📊',
    title: 'Se forskjellen',
    description: 'Sammenlign hva folket mener mot hva Stortinget vedtar. Oppdage hvor politikerne er enige eller uenige med deg.',
  },
  {
    icon: '💬',
    title: 'Påvirk debatten',
    description: 'Dine stemmer vises i statistikken. Jo flere som deltar, jo tydeligere blir folkemeningen.',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed === 'true') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleNext = () => {
    if (isAnimating) return;
    
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setCurrentStep(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (isAnimating || currentStep === 0) return;
    
    setIsAnimating(true);
    setCurrentStep(prev => prev - 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/', { replace: true });
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4 safe-top">
        <button
          onClick={handleSkip}
          className="text-muted-foreground text-sm font-medium ios-touch"
        >
          Hopp over
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className={cn(
          'transition-all duration-300',
          isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
        )}>
          <OnboardingStep
            icon={steps[currentStep].icon}
            title={steps[currentStep].title}
            description={steps[currentStep].description}
          />
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="p-6 safe-bottom">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => !isAnimating && setCurrentStep(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === currentStep 
                  ? 'w-8 bg-nrk-primary' 
                  : 'w-2 bg-secondary hover:bg-secondary/80'
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center ios-press"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          
          <button
            onClick={handleNext}
            className={cn(
              'flex-1 h-14 rounded-full font-semibold ios-press flex items-center justify-center gap-2 transition-colors',
              isLastStep 
                ? 'bg-nrk-success text-white' 
                : 'bg-nrk-primary text-white'
            )}
          >
            {isLastStep ? (
              <>
                <Check className="h-5 w-5" />
                Kom i gang
              </>
            ) : (
              <>
                Neste
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function checkOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

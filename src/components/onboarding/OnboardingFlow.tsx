import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import OnboardingIntro from './OnboardingIntro';
import OnboardingDemoVote from './OnboardingDemoVote';
import OnboardingQuiz from './OnboardingQuiz';
import OnboardingInterests from './OnboardingInterests';
import OnboardingComplete from './OnboardingComplete';
import { useGamification } from '@/hooks/useGamification';

const ONBOARDING_KEY = 'hasCompletedOnboarding';

export type OnboardingStep = 'intro1' | 'intro2' | 'demo' | 'quiz' | 'interests' | 'complete';

const STEPS: OnboardingStep[] = ['intro1', 'intro2', 'demo', 'quiz', 'interests', 'complete'];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('intro1');
  const [isAnimating, setIsAnimating] = useState(false);
  const [quizResult, setQuizResult] = useState<Record<string, number>>({});
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { completeOnboarding } = useGamification();

  const currentIndex = STEPS.indexOf(currentStep);
  const isLastStep = currentStep === 'complete';

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (completed === 'true') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const goToStep = (step: OnboardingStep) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentStep(step);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleNext = () => {
    if (isAnimating) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex]);
    }
  };

  const handlePrev = () => {
    if (isAnimating || currentIndex === 0) return;
    goToStep(STEPS[currentIndex - 1]);
  };

  const handleQuizComplete = (result: Record<string, number>) => {
    setQuizResult(result);
    // Auto-select top interests based on quiz
    const topCategories = Object.entries(result)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);
    setSelectedInterests(topCategories);
    handleNext();
  };

  const handleInterestsComplete = (interests: string[]) => {
    setSelectedInterests(interests);
    handleNext();
  };

  const handleComplete = async () => {
    await completeOnboarding(selectedInterests, quizResult);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/', { replace: true });
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    navigate('/', { replace: true });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'intro1':
        return (
          <OnboardingIntro
            icon="🗳️"
            title="Stem som folket"
            description="Se de samme sakene som politikerne på Stortinget stemmer over, og gi din stemme. Din mening teller!"
          />
        );
      case 'intro2':
        return (
          <OnboardingIntro
            icon="📊"
            title="Se forskjellen"
            description="Sammenlign hva folket mener mot hva Stortinget vedtar. Oppdage hvor politikerne er enige eller uenige med deg."
          />
        );
      case 'demo':
        return <OnboardingDemoVote onComplete={handleNext} />;
      case 'quiz':
        return <OnboardingQuiz onComplete={handleQuizComplete} />;
      case 'interests':
        return (
          <OnboardingInterests
            initialSelected={selectedInterests}
            onComplete={handleInterestsComplete}
          />
        );
      case 'complete':
        return <OnboardingComplete onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  // Don't show nav buttons on interactive steps
  const showNavButtons = !['demo', 'quiz', 'interests', 'complete'].includes(currentStep);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4 safe-top">
        <button
          onClick={handleSkip}
          className="text-muted-foreground text-sm font-medium"
        >
          Hopp over
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-6">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {currentIndex + 1} av {STEPS.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center py-4 px-4 overflow-hidden">
        <div
          className={cn(
            'w-full max-w-md transition-all duration-300',
            isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          )}
        >
          {renderStep()}
        </div>
      </div>

      {/* Bottom navigation */}
      {showNavButtons && (
        <div className="p-6 safe-bottom">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((step, index) => (
              <button
                key={step}
                onClick={() => index < currentIndex && goToStep(STEPS[index])}
                disabled={index > currentIndex}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  index === currentIndex
                    ? 'w-8 bg-primary'
                    : index < currentIndex
                    ? 'w-2 bg-primary/50 hover:bg-primary/70'
                    : 'w-2 bg-secondary'
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentIndex > 0 && (
              <button
                onClick={handlePrev}
                className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <button
              onClick={handleNext}
              className={cn(
                'flex-1 h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors',
                isLastStep
                  ? 'bg-green-500 text-white'
                  : 'bg-primary text-primary-foreground'
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
      )}
    </div>
  );
}

export function checkOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

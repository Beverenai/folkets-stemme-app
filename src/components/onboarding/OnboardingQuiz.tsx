import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';

interface OnboardingQuizProps {
  onComplete: (result: Record<string, number>) => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  category: string;
  forCategory: string;
  againstCategory: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Bør staten bruke mer penger på helse og omsorg?',
    category: 'Helse',
    forCategory: 'Helse',
    againstCategory: 'Økonomi',
  },
  {
    id: 'q2',
    question: 'Er klimatiltak viktigere enn økonomisk vekst?',
    category: 'Miljø',
    forCategory: 'Miljø',
    againstCategory: 'Næring',
  },
  {
    id: 'q3',
    question: 'Bør innvandring til Norge bli strengere regulert?',
    category: 'Innvandring',
    forCategory: 'Innvandring',
    againstCategory: 'Arbeid',
  },
  {
    id: 'q4',
    question: 'Bør skattene økes for å finansiere bedre velferd?',
    category: 'Skatt',
    forCategory: 'Velferd',
    againstCategory: 'Skatt',
  },
  {
    id: 'q5',
    question: 'Bør Norge satse mer på forsvaret?',
    category: 'Forsvar',
    forCategory: 'Forsvar',
    againstCategory: 'Utenriks',
  },
];

export default function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'for' | 'mot'>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUIZ_QUESTIONS.length - 1;

  const handleAnswer = (answer: 'for' | 'mot') => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    setTimeout(() => {
      if (isLastQuestion) {
        // Calculate category scores
        const categoryScores: Record<string, number> = {};
        QUIZ_QUESTIONS.forEach((q) => {
          const userAnswer = newAnswers[q.id];
          const category = userAnswer === 'for' ? q.forCategory : q.againstCategory;
          categoryScores[category] = (categoryScores[category] || 0) + 1;
        });
        onComplete(categoryScores);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className="flex flex-col px-4 animate-fade-in">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-3">
          Politisk kompass
        </span>
        <h2 className="text-xl font-bold">Hva er viktig for deg?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Svar på 5 raske spørsmål
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {QUIZ_QUESTIONS.map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index < currentIndex
                ? 'bg-primary'
                : index === currentIndex
                ? 'bg-primary/50'
                : 'bg-secondary'
            )}
          />
        ))}
      </div>

      {/* Question */}
      <div
        className={cn(
          'bg-card rounded-xl p-6 border mb-6 transition-all duration-300',
          isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
        )}
      >
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          Spørsmål {currentIndex + 1} av {QUIZ_QUESTIONS.length}
        </span>
        <h3 className="text-lg font-semibold mt-2">{currentQuestion.question}</h3>
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswer('for')}
          className={cn(
            'h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
            'bg-green-500/10 text-green-600 border-2 border-green-500/30',
            'hover:bg-green-500 hover:text-white hover:border-green-500 active:scale-95'
          )}
        >
          <ThumbsUp className="w-5 h-5" />
          Ja
        </button>
        <button
          onClick={() => handleAnswer('mot')}
          className={cn(
            'h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
            'bg-red-500/10 text-red-600 border-2 border-red-500/30',
            'hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95'
          )}
        >
          <ThumbsDown className="w-5 h-5" />
          Nei
        </button>
      </div>

      {/* Skip button */}
      <button
        onClick={() => handleAnswer('for')} // Default to "for" if skipped
        className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
      >
        Hopp over
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

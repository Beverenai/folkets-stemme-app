import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';
import { KATEGORI_CONFIG } from '@/lib/kategoriConfig';

interface OnboardingInterestsProps {
  initialSelected: string[];
  onComplete: (interests: string[]) => void;
}

const INTEREST_OPTIONS = Object.entries(KATEGORI_CONFIG).map(([key, config]) => ({
  id: key,
  label: config.navn,
  icon: getIconForCategory(key),
}));

function getIconForCategory(key: string): string {
  const icons: Record<string, string> = {
    'Justis': '⚖️',
    'Helse': '🏥',
    'Økonomi': '💰',
    'Budsjett': '📊',
    'Miljø': '🌿',
    'Arbeid': '👷',
    'Sikkerhet': '🛡️',
    'Innvandring': '🌍',
    'Lovendring': '📜',
    'Grunnlovsendring': '🏛️',
    'Telekommunikasjon': '📡',
    'Skatt': '💳',
    'Helse og arbeid': '🩺',
    'Kommunal forvaltning': '🏘️',
  };
  return icons[key] || '📋';
}

export default function OnboardingInterests({
  initialSelected,
  onComplete,
}: OnboardingInterestsProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < 5
        ? [...prev, id]
        : prev
    );
  };

  const canContinue = selected.length >= 2;

  return (
    <div className="flex flex-col px-4 animate-fade-in">
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-3">
          Personalisering
        </span>
        <h2 className="text-xl font-bold">Hva interesserer deg?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Velg 2-5 kategorier for å se relevante saker først
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 max-h-[40vh] overflow-y-auto">
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selected.includes(interest.id);
          return (
            <button
              key={interest.id}
              onClick={() => toggleInterest(interest.id)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{interest.icon}</span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="font-medium text-sm mt-2">{interest.label}</p>
            </button>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground mb-4">
        {selected.length} av 5 valgt {selected.length < 2 && '(minimum 2)'}
      </div>

      <button
        onClick={() => canContinue && onComplete(selected)}
        disabled={!canContinue}
        className={cn(
          'h-14 rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
          canContinue
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground cursor-not-allowed'
        )}
      >
        Fortsett
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

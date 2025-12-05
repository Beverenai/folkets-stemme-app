interface OnboardingIntroProps {
  icon: string;
  title: string;
  description: string;
}

export default function OnboardingIntro({ icon, title, description }: OnboardingIntroProps) {
  return (
    <div className="flex flex-col items-center text-center px-6">
      <div className="text-7xl mb-8 animate-fade-in">{icon}</div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Scale, Wallet, ScrollText, FileText, Hand } from 'lucide-react';

const KATEGORIER: Record<string, { label: string; icon: React.ElementType; bgClass: string; textClass: string }> = {
  lovendring: { label: 'Lovendring', icon: Scale, bgClass: 'bg-[hsl(211,100%,50%)]/20', textClass: 'text-[hsl(211,100%,60%)]' },
  budsjett: { label: 'Budsjett', icon: Wallet, bgClass: 'bg-[hsl(142,71%,45%)]/20', textClass: 'text-[hsl(142,71%,55%)]' },
  grunnlov: { label: 'Grunnlov', icon: ScrollText, bgClass: 'bg-[hsl(45,93%,47%)]/20', textClass: 'text-[hsl(45,93%,57%)]' },
  melding: { label: 'Melding', icon: FileText, bgClass: 'bg-[hsl(271,91%,65%)]/20', textClass: 'text-[hsl(271,91%,70%)]' },
  representantforslag: { label: 'Forslag', icon: Hand, bgClass: 'bg-[hsl(187,92%,69%)]/20', textClass: 'text-[hsl(187,92%,69%)]' },
  politikk: { label: 'Politikk', icon: FileText, bgClass: 'bg-[hsl(330,81%,60%)]/20', textClass: 'text-[hsl(330,81%,65%)]' },
};

interface KategoriBadgeProps {
  kategori: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function KategoriBadge({ kategori, size = 'md', showIcon = true }: KategoriBadgeProps) {
  const key = (kategori || 'politikk').toLowerCase();
  const config = KATEGORIER[key] || KATEGORIER.politikk;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full uppercase tracking-wide',
      config.bgClass,
      config.textClass,
      sizeClasses[size]
    )}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

export function getKategoriLabel(kategori: string | null | undefined): string {
  const key = (kategori || 'politikk').toLowerCase();
  return KATEGORIER[key]?.label || 'Politikk';
}

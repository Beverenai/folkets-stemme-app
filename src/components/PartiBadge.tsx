import { getPartiConfig } from '@/lib/partiConfig';

interface PartiBadgeProps {
  parti: string | null;
  size?: 'sm' | 'md' | 'lg';
  showFullName?: boolean;
  className?: string;
}

export default function PartiBadge({ 
  parti, 
  size = 'sm', 
  showFullName = false,
  className = '' 
}: PartiBadgeProps) {
  const config = getPartiConfig(parti);
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: config.farge,
        color: config.tekstFarge,
      }}
    >
      {showFullName ? config.navn : config.forkortelse}
    </span>
  );
}

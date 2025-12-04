import { Link, useLocation } from 'react-router-dom';
import { Home, Vote, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

const navItems = [
  { href: '/', label: 'Hjem', icon: Home },
  { href: '/stem', label: 'Stem', icon: Vote },
  { href: '/profil', label: 'Profil', icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-xl border-t border-border" />
      
      {/* Content */}
      <div className="relative flex items-center justify-around h-[84px] px-6 safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => triggerHaptic('light')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[72px] py-2 rounded-2xl transition-all duration-200 ease-out',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground active:text-foreground active:scale-95'
              )}
            >
              {/* Icon container with active background */}
              <div className={cn(
                'relative flex items-center justify-center h-8 w-12 rounded-2xl transition-all duration-200',
                isActive && 'bg-primary/15'
              )}>
                <Icon
                  className={cn(
                    'h-6 w-6 transition-all duration-200',
                    isActive && 'scale-105'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-[11px] tracking-tight transition-all duration-200',
                isActive ? 'font-bold' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

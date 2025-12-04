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
      {/* iOS-style frosted glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/30" />
      
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
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 transition-all duration-300 ease-out',
                isActive ? 'text-primary' : 'text-muted-foreground/70 active:text-muted-foreground'
              )}
            >
              <div className="relative flex items-center justify-center h-7">
                <Icon
                  className={cn(
                    'h-[26px] w-[26px] transition-transform duration-300',
                    isActive && 'scale-105'
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </div>
              <span className={cn(
                'text-[10px] tracking-tight transition-all duration-300',
                isActive ? 'font-semibold' : 'font-medium'
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

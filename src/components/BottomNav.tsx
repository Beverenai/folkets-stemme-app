import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Hjem', icon: Home },
  { href: '/saker', label: 'Saker', icon: FileText },
  { href: '/statistikk', label: 'Statistikk', icon: BarChart3 },
  { href: '/profil', label: 'Profil', icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border safe-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full ios-touch',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 transition-all',
                  isActive && 'animate-ios-bounce'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-semibold'
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

import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Hjem', icon: Home },
  { href: '/saker', label: 'Saker', icon: FileText },
  { href: '/representanter', label: 'Politikere', icon: Users },
  { href: '/statistikk', label: 'Statistikk', icon: BarChart3 },
  { href: '/profil', label: 'Profil', icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Blur background */}
      <div className="absolute inset-0 bg-card/80 backdrop-blur-xl border-t border-border/50" />
      
      {/* Content */}
      <div className="relative flex items-center justify-around h-20 px-2 safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-all duration-200 ios-press',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'relative p-2 rounded-xl transition-all duration-200',
                isActive && 'bg-primary/15'
              )}>
                <Icon
                  className={cn(
                    'h-6 w-6 transition-all',
                    isActive && 'animate-ios-bounce'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-all',
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
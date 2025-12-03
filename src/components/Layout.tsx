import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, BarChart3, User, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
  title?: string;
}

const navItems = [
  { href: '/', label: 'Hjem', icon: Home },
  { href: '/saker', label: 'Saker', icon: FileText },
  { href: '/statistikk', label: 'Statistikk', icon: BarChart3 },
  { href: '/profil', label: 'Min profil', icon: User },
];

export default function Layout({ children, hideHeader, title }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* iOS-style Header - Desktop */}
      <header className="hidden md:block sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <span className="text-lg">🏛️</span>
              </div>
              <span className="font-semibold text-lg">
                Folkets Storting
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ios-press',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-2">
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-muted-foreground ios-press"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logg ut
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  size="sm"
                  className="bg-primary text-primary-foreground ios-press"
                >
                  Logg inn
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* iOS-style Mobile Header */}
      {!hideHeader && (
        <header className="md:hidden sticky top-0 z-40 glass border-b border-border safe-top">
          <div className="flex items-center justify-center h-12 px-4 relative">
            <h1 className="font-semibold text-[17px]">
              {title || 'Folkets Storting'}
            </h1>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="pb-tab-bar md:pb-0 min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <BottomNav />
    </div>
  );
}

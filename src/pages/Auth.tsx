import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Ugyldig e-post');
const passwordSchema = z.string().min(6, 'Minst 6 tegn');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    try { emailSchema.parse(email); } catch (e) { if (e instanceof z.ZodError) newErrors.email = e.errors[0].message; }
    try { passwordSchema.parse(password); } catch (e) { if (e instanceof z.ZodError) newErrors.password = e.errors[0].message; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Feil', description: error.message === 'Invalid login credentials' ? 'Feil e-post eller passord' : error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Velkommen!' });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({ title: 'Feil', description: error.message.includes('already registered') ? 'E-post allerede registrert' : error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Velkommen!' });
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-40">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate('/')} className="ios-touch -ml-2 p-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-[17px]">
            {isLogin ? 'Logg inn' : 'Registrer'}
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="px-4 py-8 animate-ios-fade">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
            <span className="text-3xl">🏛️</span>
          </div>
          <h2 className="text-2xl font-bold">Folketinget</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Din stemme teller
          </p>
        </div>

        {/* Segmented Control */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ios-press',
              isLogin ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            Logg inn
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ios-press',
              !isLogin ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            )}
          >
            Registrer
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm">Navn (valgfritt)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ditt navn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-11 h-12 bg-secondary border-0 rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">E-post</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn('pl-11 h-12 bg-secondary border-0 rounded-xl', errors.email && 'ring-2 ring-destructive')}
                required
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm">Passord</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn('pl-11 pr-11 h-12 bg-secondary border-0 rounded-xl', errors.password && 'ring-2 ring-destructive')}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground ios-touch"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold ios-press"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {isLogin ? 'Logger inn...' : 'Registrerer...'}
              </span>
            ) : (
              isLogin ? 'Logg inn' : 'Opprett konto'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ved å registrere deg godtar du at din stemme lagres anonymt.
        </p>
      </div>
    </div>
  );
}

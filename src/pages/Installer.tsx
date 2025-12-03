import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Share, Plus, Check, Smartphone } from 'lucide-react';
import Layout from '@/components/Layout';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Installer() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <Layout hideHeader>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-0.5 text-primary ios-press -ml-1"
          >
            <ChevronLeft className="h-7 w-7" />
            <span className="text-[17px]">Tilbake</span>
          </button>
          <h1 className="font-semibold text-sm">Installer app</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="px-4 py-8 space-y-6 animate-ios-fade">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Smartphone className="h-12 w-12 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Installer Folkets Storting</h1>
            <p className="text-muted-foreground mt-2">
              Få rask tilgang til appen fra hjemskjermen din
            </p>
          </div>
        </div>

        {/* Already installed */}
        {isInstalled && (
          <div className="premium-card p-6 text-center bg-vote-for/10 border-vote-for/30">
            <Check className="h-12 w-12 text-vote-for mx-auto mb-3" />
            <h2 className="font-semibold text-lg">Appen er installert!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Du kjører allerede Folkets Storting som en app.
            </p>
          </div>
        )}

        {/* Android/Chrome install button */}
        {!isInstalled && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full premium-card p-6 flex items-center gap-4 ios-press hover:bg-accent/50 transition-colors"
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Download className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Installer nå</h3>
              <p className="text-sm text-muted-foreground">
                Trykk for å legge til på hjemskjermen
              </p>
            </div>
          </button>
        )}

        {/* iOS instructions */}
        {!isInstalled && isIOS && (
          <div className="premium-card p-6 space-y-4">
            <h2 className="font-semibold text-lg">Slik installerer du på iPhone</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Share className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">1. Trykk på Del-knappen</p>
                  <p className="text-sm text-muted-foreground">
                    Finn Del-ikonet nederst i Safari-nettleseren
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">2. Velg «Legg til på Hjem-skjerm»</p>
                  <p className="text-sm text-muted-foreground">
                    Scroll ned i menyen og trykk på alternativet
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">3. Bekreft med «Legg til»</p>
                  <p className="text-sm text-muted-foreground">
                    Appen vil nå vises på hjemskjermen din
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generic instructions for other browsers */}
        {!isInstalled && !deferredPrompt && !isIOS && (
          <div className="premium-card p-6 space-y-4">
            <h2 className="font-semibold text-lg">Slik installerer du appen</h2>
            <p className="text-muted-foreground">
              Åpne denne siden i Chrome eller Safari, og se etter «Installer» eller «Legg til på Hjem-skjerm» i nettlesermenyen.
            </p>
          </div>
        )}

        {/* Benefits */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg px-1">Fordeler med appen</h2>
          
          {[
            { title: 'Rask tilgang', desc: 'Åpne appen direkte fra hjemskjermen' },
            { title: 'Fungerer offline', desc: 'Se tidligere stemmer uten internett' },
            { title: 'Fullskjerm', desc: 'Opplev appen uten nettlesergrensesnitt' },
            { title: 'Raskere lasting', desc: 'Appen lagres lokalt på enheten din' },
          ].map((benefit, i) => (
            <div key={i} className="premium-card p-4 flex items-center gap-3">
              <Check className="h-5 w-5 text-vote-for flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{benefit.title}</p>
                <p className="text-xs text-muted-foreground">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

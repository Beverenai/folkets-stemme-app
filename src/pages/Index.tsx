import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Vote, ChevronRight, Sparkles } from 'lucide-react';
import PolitikereFolketPreview from '@/components/PolitikereFolketPreview';

export default function Index() {
  const { user } = useAuth();

  return (
    <Layout title="Hjem">
      <div className="px-4 py-5 space-y-6 animate-ios-fade">
        {/* Hero Section */}
        <div className="text-center pt-2 pb-4">
          <h1 className="text-2xl font-bold mb-2">Folketinget</h1>
          <p className="text-sm text-muted-foreground">
            Se hvordan politikerne stemmer — og sammenlign med folket
          </p>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            to="/stem"
            className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex flex-col items-center gap-2 ios-press hover:bg-primary/15 transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Vote className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-primary">Stem nå</span>
          </Link>
          
          {!user ? (
            <Link 
              to="/auth"
              className="rounded-2xl bg-secondary border border-border/50 p-4 flex flex-col items-center gap-2 ios-press hover:bg-secondary/80 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold">Logg inn</span>
            </Link>
          ) : (
            <Link 
              to="/profil"
              className="rounded-2xl bg-secondary border border-border/50 p-4 flex flex-col items-center gap-2 ios-press hover:bg-secondary/80 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold">Min profil</span>
            </Link>
          )}
        </div>

        {/* Politikerne vs Folket */}
        <div className="animate-ios-slide-up">
          <PolitikereFolketPreview />
        </div>
      </div>
    </Layout>
  );
}

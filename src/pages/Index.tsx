import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import PolitikereFolketPreview from '@/components/PolitikereFolketPreview';

export default function Index() {
  const { user } = useAuth();

  return (
    <Layout title="Hjem">
      <div className="px-4 py-6 space-y-6 animate-ios-fade">
        {/* CTA for non-logged in users */}
        {!user && (
          <div className="animate-ios-spring">
            <Button asChild className="w-full h-12 text-base font-semibold ios-press rounded-xl">
              <Link to="/auth">
                <Sparkles className="mr-2 h-5 w-5" />
                Kom i gang
              </Link>
            </Button>
          </div>
        )}

        {/* Politikerne vs Folket */}
        <div className="animate-ios-slide-up stagger-1">
          <PolitikereFolketPreview />
        </div>
      </div>
    </Layout>
  );
}

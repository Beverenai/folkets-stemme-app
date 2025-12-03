import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import KategoriBadge from './KategoriBadge';

interface KonfliktSak {
  id: string;
  tittel: string;
  kort_tittel: string | null;
  kategori: string | null;
  folkeFor: number;
  folkeMot: number;
  stortingetFor: number;
  stortingetMot: number;
  avvikProsent: number;
}

interface TopKonfliktSakerProps {
  limit?: number;
  className?: string;
}

export default function TopKonfliktSaker({ limit = 10, className }: TopKonfliktSakerProps) {
  const [saker, setSaker] = useState<KonfliktSak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKonfliktSaker() {
      try {
        const sb = supabase as any;
        
        // Get avsluttede saker with votes
        const { data: sakerData } = await sb
          .from('stortinget_saker')
          .select(`
            id, 
            tittel, 
            kort_tittel, 
            kategori,
            stortinget_votering_for, 
            stortinget_votering_mot,
            folke_stemmer(stemme)
          `)
          .eq('status', 'avsluttet')
          .eq('er_viktig', true)
          .not('stortinget_votering_for', 'is', null);

        if (!sakerData) {
          setLoading(false);
          return;
        }

        // Calculate conflict for each sak
        const konfliktSaker: KonfliktSak[] = sakerData
          .map((sak: any) => {
            const folkeFor = sak.folke_stemmer?.filter((s: any) => s.stemme === 'for').length || 0;
            const folkeMot = sak.folke_stemmer?.filter((s: any) => s.stemme === 'mot').length || 0;
            const folkeTotal = folkeFor + folkeMot;
            
            if (folkeTotal === 0) return null;

            const stortingetFor = sak.stortinget_votering_for || 0;
            const stortingetMot = sak.stortinget_votering_mot || 0;
            const stortingetTotal = stortingetFor + stortingetMot;

            if (stortingetTotal === 0) return null;

            const folkeForPct = (folkeFor / folkeTotal) * 100;
            const stortingetForPct = (stortingetFor / stortingetTotal) * 100;
            
            // Calculate divergence - higher = more conflict
            const avvikProsent = Math.abs(folkeForPct - stortingetForPct);

            // Only include if there's actual disagreement (folk majority != stortinget majority)
            const folkeMajority = folkeFor > folkeMot;
            const stortingetMajority = stortingetFor > stortingetMot;
            
            if (folkeMajority === stortingetMajority) return null;

            return {
              id: sak.id,
              tittel: sak.tittel,
              kort_tittel: sak.kort_tittel,
              kategori: sak.kategori,
              folkeFor,
              folkeMot,
              stortingetFor,
              stortingetMot,
              avvikProsent,
            };
          })
          .filter((s: any): s is KonfliktSak => s !== null)
          .sort((a: KonfliktSak, b: KonfliktSak) => b.avvikProsent - a.avvikProsent)
          .slice(0, limit);

        setSaker(konfliktSaker);
      } catch (error) {
        console.error('Error fetching konflikt saker:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchKonfliktSaker();
  }, [limit]);

  if (loading) {
    return (
      <div className={cn('nrk-card', className)}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-nrk-danger" />
          <h3 className="font-bold text-lg">Saker med størst konflikt</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (saker.length === 0) {
    return (
      <div className={cn('nrk-card', className)}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-nrk-danger" />
          <h3 className="font-bold text-lg">Saker med størst konflikt</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          Ingen konfliktsaker funnet ennå
        </p>
      </div>
    );
  }

  return (
    <div className={cn('nrk-card', className)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-nrk-danger" />
        <h3 className="font-bold text-lg">Saker med størst konflikt</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Saker der folket og Stortinget er mest uenige
      </p>

      <div className="space-y-2">
        {saker.map((sak, index) => (
          <Link
            key={sak.id}
            to={`/sak/${sak.id}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary ios-press transition-colors animate-ios-slide-up"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div className="h-8 w-8 rounded-full bg-nrk-danger/20 flex items-center justify-center text-sm font-bold text-nrk-danger shrink-0">
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">
                {sak.kort_tittel || sak.tittel}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <KategoriBadge kategori={sak.kategori} size="sm" showIcon={false} />
                <span className="text-xs text-nrk-danger font-medium">
                  {Math.round(sak.avvikProsent)}% avvik
                </span>
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

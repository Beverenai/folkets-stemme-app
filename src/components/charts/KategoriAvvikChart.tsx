import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Scale, Wallet, ScrollText, FileText, Hand, TrendingDown } from 'lucide-react';

const KATEGORI_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  lovendring: { label: 'Lovendring', icon: Scale, color: 'hsl(211, 100%, 50%)' },
  budsjett: { label: 'Budsjett', icon: Wallet, color: 'hsl(142, 71%, 45%)' },
  grunnlov: { label: 'Grunnlov', icon: ScrollText, color: 'hsl(45, 93%, 47%)' },
  melding: { label: 'Melding', icon: FileText, color: 'hsl(271, 91%, 65%)' },
  representantforslag: { label: 'Forslag', icon: Hand, color: 'hsl(187, 92%, 69%)' },
  politikk: { label: 'Politikk', icon: FileText, color: 'hsl(330, 81%, 60%)' },
};

interface KategoriStat {
  kategori: string;
  avvik: number;
  samsvar: number;
  total: number;
}

export default function KategoriAvvikChart() {
  const [data, setData] = useState<KategoriStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = supabase as any;
        
        const { data: saker } = await sb
          .from('stortinget_saker')
          .select(`
            kategori,
            stortinget_votering_for,
            stortinget_votering_mot,
            folke_stemmer(stemme)
          `)
          .eq('status', 'avsluttet')
          .eq('er_viktig', true)
          .not('stortinget_votering_for', 'is', null);

        const kategoriStats: Record<string, { avvik: number; samsvar: number }> = {};

        (saker || []).forEach((sak: any) => {
          const kategori = (sak.kategori || 'politikk').toLowerCase();
          const folkeStemmer = sak.folke_stemmer || [];
          if (folkeStemmer.length === 0) return;

          if (!kategoriStats[kategori]) {
            kategoriStats[kategori] = { avvik: 0, samsvar: 0 };
          }

          const folkeFor = folkeStemmer.filter((s: any) => s.stemme === 'for').length;
          const folkeMot = folkeStemmer.filter((s: any) => s.stemme === 'mot').length;
          const folkeMajority = folkeFor > folkeMot ? 'for' : 'mot';
          const stortingetMajority = (sak.stortinget_votering_for || 0) > (sak.stortinget_votering_mot || 0) ? 'for' : 'mot';

          if (folkeMajority === stortingetMajority) {
            kategoriStats[kategori].samsvar++;
          } else {
            kategoriStats[kategori].avvik++;
          }
        });

        const result: KategoriStat[] = Object.entries(kategoriStats)
          .filter(([_, stats]) => stats.avvik + stats.samsvar > 0)
          .map(([kategori, stats]) => ({
            kategori,
            avvik: stats.avvik,
            samsvar: stats.samsvar,
            total: stats.avvik + stats.samsvar,
          }))
          .sort((a, b) => (b.avvik / b.total) - (a.avvik / a.total));

        setData(result);
      } catch (error) {
        console.error('Error fetching kategori avvik:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Ikke nok data ennå</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const config = KATEGORI_CONFIG[item.kategori] || KATEGORI_CONFIG.politikk;
        const Icon = config.icon;
        const avvikPct = Math.round((item.avvik / item.total) * 100);

        return (
          <div 
            key={item.kategori} 
            className="flex items-center gap-3 animate-ios-slide-up"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div 
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: config.color }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{config.label}</span>
                <span className={cn(
                  'text-sm font-bold',
                  avvikPct > 40 ? 'text-vote-mot' : avvikPct > 20 ? 'text-vote-avholdende' : 'text-vote-for'
                )}>
                  {avvikPct}% avvik
                </span>
              </div>
              
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-vote-mot/80 transition-all duration-700"
                  style={{ width: `${avvikPct}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {item.samsvar} samsvar, {item.avvik} avvik av {item.total} saker
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface ViktigeSakerDenneUkenProps {
  className?: string;
}

export default function ViktigeSakerDenneUken({ className }: ViktigeSakerDenneUkenProps) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeekCount() {
      try {
        const sb = supabase as any;
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        const { count: weekCount } = await sb
          .from('stortinget_saker')
          .select('*', { count: 'exact', head: true })
          .eq('er_viktig', true)
          .gte('updated_at', weekStart.toISOString())
          .lte('updated_at', weekEnd.toISOString());

        setCount(weekCount || 0);
      } catch (error) {
        console.error('Error fetching week count:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeekCount();
  }, []);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekRange = `${format(weekStart, 'd', { locale: nb })}-${format(weekEnd, 'd. MMM', { locale: nb })}`;

  return (
    <div className={cn('nrk-card text-center', className)}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <CalendarDays className="h-5 w-5 text-nrk-primary" />
        <h3 className="font-bold text-lg">Viktige saker denne uken</h3>
      </div>

      {loading ? (
        <div className="py-8">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          <div className="py-4">
            <p className="text-6xl font-bold gradient-text animate-ios-spring">
              {count}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {count === 1 ? 'sak' : 'saker'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{weekRange}</span>
          </div>
        </>
      )}
    </div>
  );
}

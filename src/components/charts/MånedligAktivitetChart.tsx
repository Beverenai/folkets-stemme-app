import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar } from 'lucide-react';

interface MonthData {
  month: string;
  saker: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

export default function MånedligAktivitetChart() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = supabase as any;
        
        // Get saker from last 12 months
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const { data: saker } = await sb
          .from('stortinget_saker')
          .select('created_at')
          .eq('er_viktig', true)
          .gte('created_at', oneYearAgo.toISOString());

        // Group by month
        const monthCounts: Record<string, number> = {};
        
        (saker || []).forEach((sak: any) => {
          const date = new Date(sak.created_at);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthCounts[key] = (monthCounts[key] || 0) + 1;
        });

        // Create last 12 months data
        const result: MonthData[] = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          result.push({
            month: MONTHS[date.getMonth()],
            saker: monthCounts[key] || 0,
          });
        }

        setData(result);
      } catch (error) {
        console.error('Error fetching monthly data:', error);
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

  const totalSaker = data.reduce((sum, d) => sum + d.saker, 0);

  if (totalSaker === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Ingen aktivitet registrert ennå</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaker" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 72%, 56%)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(174, 72%, 56%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(0, 0%, 56%)', fontSize: 11 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(0, 0%, 56%)', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(0, 0%, 11%)', 
                border: '1px solid hsl(0, 0%, 18%)',
                borderRadius: '8px',
                color: 'hsl(0, 0%, 100%)'
              }}
              formatter={(value: number) => [`${value} saker`, 'Viktige saker']}
            />
            <Area 
              type="monotone" 
              dataKey="saker" 
              stroke="hsl(174, 72%, 56%)" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorSaker)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Totalt: <span className="font-semibold text-foreground">{totalSaker} saker</span></span>
        </div>
      </div>
    </div>
  );
}

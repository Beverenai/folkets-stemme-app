import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_SYNC_KEY = 'folkets_storting_last_sync';

export function useDataSync() {
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    
    const shouldSync = () => {
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      if (!lastSync) return true;
      
      const lastSyncTime = parseInt(lastSync, 10);
      const now = Date.now();
      return now - lastSyncTime > SYNC_INTERVAL_MS;
    };

    const runSync = async () => {
      if (!shouldSync()) {
        console.log('Data sync skipped - last sync within 24 hours');
        return;
      }

      console.log('Starting automatic data sync...');
      hasSynced.current = true;

      try {
        // Sync in parallel for efficiency
        const [stortingetResult, representanterResult] = await Promise.allSettled([
          supabase.functions.invoke('sync-stortinget'),
          supabase.functions.invoke('sync-representanter'),
        ]);

        if (stortingetResult.status === 'fulfilled') {
          console.log('Stortinget sync completed:', stortingetResult.value.data?.message);
        } else {
          console.error('Stortinget sync failed:', stortingetResult.reason);
        }

        if (representanterResult.status === 'fulfilled') {
          console.log('Representanter sync completed:', representanterResult.value.data?.message);
        } else {
          console.error('Representanter sync failed:', representanterResult.reason);
        }

        // Update last sync time
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      } catch (error) {
        console.error('Data sync error:', error);
      }
    };

    // Run sync after a short delay to not block initial render
    const timeoutId = setTimeout(runSync, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);
}

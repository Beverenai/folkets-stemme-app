const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function getProxiedImageUrl(originalUrl: string | null): string {
  if (!originalUrl) return '';
  
  // If it's already a proxied URL, return as is
  if (originalUrl.includes('proxy-image')) return originalUrl;
  
  // Proxy Stortinget images through our edge function
  if (originalUrl.includes('stortinget.no') || originalUrl.includes('data.stortinget.no')) {
    return `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  }
  
  return originalUrl;
}

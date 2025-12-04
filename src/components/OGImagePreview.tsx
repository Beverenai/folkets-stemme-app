import { useState, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

interface OGImagePreviewProps {
  sakId: string;
  type?: 'sak' | 'votering';
  title: string;
  className?: string;
}

export default function OGImagePreview({ sakId, type = 'sak', title, className }: OGImagePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Construct the OG image URL
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${baseUrl}/functions/v1/og-image?id=${sakId}&type=${type}`;
    setImageUrl(url);
    setLoading(false);
  }, [sakId, type]);

  if (loading) {
    return (
      <div className={`aspect-[1200/630] bg-secondary rounded-xl flex items-center justify-center ${className}`}>
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`aspect-[1200/630] bg-secondary rounded-xl flex flex-col items-center justify-center gap-2 ${className}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Kunne ikke laste forhåndsvisning</span>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div className="aspect-[1200/630] rounded-xl overflow-hidden border border-border bg-card">
        <img
          src={imageUrl}
          alt={`OG Preview for ${title}`}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      </div>
      
      {/* Preview label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        <span>Forhåndsvisning ved deling</span>
      </div>
    </div>
  );
}
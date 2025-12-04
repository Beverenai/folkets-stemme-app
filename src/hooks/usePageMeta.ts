import { useEffect } from 'react';

interface PageMetaProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  type?: string;
}

export function usePageMeta({
  title,
  description,
  ogImage,
  ogUrl,
  type = 'website',
}: PageMetaProps) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = `${title} | Folkets Storting`;
    }

    // Update meta tags
    const updateMetaTag = (selector: string, content: string) => {
      const element = document.querySelector(selector);
      if (element) {
        element.setAttribute('content', content);
      }
    };

    if (description) {
      updateMetaTag('meta[name="description"]', description);
      updateMetaTag('meta[property="og:description"]', description);
      updateMetaTag('meta[name="twitter:description"]', description);
    }

    if (title) {
      updateMetaTag('meta[property="og:title"]', title);
      updateMetaTag('meta[name="twitter:title"]', title);
    }

    if (ogImage) {
      updateMetaTag('meta[property="og:image"]', ogImage);
      updateMetaTag('meta[name="twitter:image"]', ogImage);
    }

    if (ogUrl) {
      updateMetaTag('meta[property="og:url"]', ogUrl);
    }

    if (type) {
      updateMetaTag('meta[property="og:type"]', type);
    }

    // Cleanup: Reset to defaults when component unmounts
    return () => {
      document.title = 'Folkets Storting - Stem på Stortingets saker';
      updateMetaTag('meta[name="description"]', 'Se hva folket mener om politiske saker og sammenlign med Stortinget. Stem på viktige politiske saker og se om politikerne representerer deg.');
      updateMetaTag('meta[property="og:title"]', 'Folkets Storting - Stem på Stortingets saker');
      updateMetaTag('meta[property="og:description"]', 'Se hva folket mener om politiske saker og sammenlign med Stortinget. Stem på viktige politiske saker og se om politikerne representerer deg.');
      updateMetaTag('meta[property="og:image"]', 'https://lovable.dev/opengraph-image-p98pqg.png');
      updateMetaTag('meta[name="twitter:image"]', 'https://lovable.dev/opengraph-image-p98pqg.png');
    };
  }, [title, description, ogImage, ogUrl, type]);
}

// Helper to generate OG image URL for a case
export function getOGImageUrl(sakId: string, type: 'sak' | 'votering' = 'sak'): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?id=${sakId}&type=${type}`;
}
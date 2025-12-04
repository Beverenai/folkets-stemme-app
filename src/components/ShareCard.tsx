import { useState, useRef } from 'react';
import { Share2, Check, Image, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ShareableCard from './ShareableCard';

interface ShareCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tittel?: string;
  kortTittel?: string | null;
  summary?: string;
  sakId?: string;
  voteringId?: string;
  type?: 'sak' | 'votering';
  kategori?: string | null;
  forCount: number;
  motCount: number;
  avholdendeCount?: number;
  stortingetFor?: number | null;
  stortingetMot?: number | null;
  stortingetAvholdende?: number | null;
  url: string;
}

export default function ShareCard({
  open,
  onOpenChange,
  title,
  tittel,
  kortTittel,
  sakId,
  voteringId,
  type = 'sak',
  kategori,
  forCount,
  motCount,
  avholdendeCount = 0,
  stortingetFor,
  stortingetMot,
  url,
}: ShareCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Public votes
  const total = forCount + motCount + avholdendeCount;
  const forPercent = total > 0 ? Math.round((forCount / total) * 100) : 0;
  const motPercent = total > 0 ? Math.round((motCount / total) * 100) : 0;

  // Parliament votes
  const hasStortingetVotes = stortingetFor != null && stortingetMot != null && (stortingetFor > 0 || stortingetMot > 0);
  const vedtatt = (stortingetFor || 0) > (stortingetMot || 0);

  // Agreement check
  const publicMajority = forPercent > motPercent ? 'for' : forPercent < motPercent ? 'mot' : 'likt';
  const stortingetMajority = (stortingetFor || 0) > (stortingetMot || 0) ? 'for' : (stortingetFor || 0) < (stortingetMot || 0) ? 'mot' : 'likt';
  const isAgreement = publicMajority === stortingetMajority;

  // Share text
  const shareText = hasStortingetVotes
    ? `${title}

📊 Folkets mening:
✅ ${forPercent}% For
❌ ${motPercent}% Mot

🏛️ Stortingets vedtak: ${vedtatt ? 'Vedtatt' : 'Forkastet'} (${stortingetFor}–${stortingetMot})

${isAgreement ? '✓ Folket er ENIG med Stortinget' : '✗ Folket er UENIG med Stortinget'}

Stem selv på Folketinget!`
    : `${title}

📊 Folkets mening:
✅ ${forPercent}% For
❌ ${motPercent}% Mot

Stem selv på Folketinget!`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const shareAsImage = async () => {
    if (!cardRef.current) return;
    
    setIsGeneratingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Could not create blob'));
        }, 'image/png', 1.0);
      });
      
      const file = new File([blob], 'folketinget-kort.png', { type: 'image/png' });
      
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Folketinget',
          text: `Stem selv på Folketinget!\n${url}`,
        });
      } else {
        // Fallback: download image
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'folketinget-kort.png';
        a.click();
        URL.revokeObjectURL(downloadUrl);
        toast({ title: 'Bildet er lastet ned!' });
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      toast({ title: 'Kunne ikke dele bilde', variant: 'destructive' });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareAsLink = async () => {
    try {
      await navigator.share({
        title: 'Folketinget',
        text: shareText,
        url: url,
      });
    } catch {
      copyLink();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${url}`);
      setCopied(true);
      toast({ title: 'Kopiert til utklippstavle!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Kunne ikke kopiere', variant: 'destructive' });
    }
  };

  const id = sakId || voteringId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">Del kortet</DialogTitle>
        </DialogHeader>

        {/* Live Card Preview */}
        <div className="flex justify-center my-4">
          <div className="transform scale-[0.7] origin-top">
            <div ref={cardRef}>
              <ShareableCard
                sakId={id || ''}
                spoersmaal={title}
                tittel={tittel || title}
                kortTittel={kortTittel}
                kategori={kategori}
                stortingetFor={stortingetFor}
                stortingetMot={stortingetMot}
                folkeFor={forCount}
                folkeMot={motCount}
              />
            </div>
          </div>
        </div>

        {/* Main Share Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={shareAsImage}
            disabled={isGeneratingImage}
            className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex flex-col gap-1"
          >
            <Image className="h-5 w-5" />
            <span className="text-xs">{isGeneratingImage ? 'Lager bilde...' : 'Del som bilde'}</span>
          </Button>
          <Button
            onClick={shareAsLink}
            variant="outline"
            className="h-14 font-semibold rounded-xl flex flex-col gap-1"
          >
            <Link2 className="h-5 w-5" />
            <span className="text-xs">Del link</span>
          </Button>
        </div>

        {/* Secondary Share Options */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-3">Eller del direkte til</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className="h-8 w-8 rounded-full bg-[#000000] flex items-center justify-center">
                <span className="text-white font-bold text-sm">𝕏</span>
              </div>
              <span className="text-[10px] font-medium">X</span>
            </button>

            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className="h-8 w-8 rounded-full bg-[#1877F2] flex items-center justify-center">
                <span className="text-white font-bold text-sm">f</span>
              </div>
              <span className="text-[10px] font-medium">Facebook</span>
            </button>

            <button
              onClick={shareAsLink}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className="h-8 w-8 rounded-full bg-vote-for flex items-center justify-center">
                <span className="text-white text-sm">💬</span>
              </div>
              <span className="text-[10px] font-medium">Melding</span>
            </button>

            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                copied ? "bg-vote-for" : "bg-muted-foreground"
              )}>
                {copied ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <span className="text-white text-sm">🔗</span>
                )}
              </div>
              <span className="text-[10px] font-medium">{copied ? 'Kopiert!' : 'Kopier'}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

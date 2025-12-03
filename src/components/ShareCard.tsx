import { useState } from 'react';
import { Share2, X as Twitter, Facebook, Link2, MessageCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ShareCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  summary?: string;
  forCount: number;
  motCount: number;
  avholdendeCount: number;
  url: string;
}

export default function ShareCard({
  open,
  onOpenChange,
  title,
  summary,
  forCount,
  motCount,
  avholdendeCount,
  url,
}: ShareCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const total = forCount + motCount + avholdendeCount;
  const forPercent = total > 0 ? Math.round((forCount / total) * 100) : 0;
  const motPercent = total > 0 ? Math.round((motCount / total) * 100) : 0;

  const shareText = `${title}\n\n📊 Folkets mening:\n✅ ${forPercent}% Enig\n❌ ${motPercent}% Uenig\n\nStem selv på Folkets Storting!`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

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

  const shareToMessages = async () => {
    try {
      await navigator.share({
        title: 'Folkets Storting',
        text: shareText,
        url: url,
      });
    } catch {
      // Fallback to copy
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="sr-only">Del sak</DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <div className="bg-background rounded-xl p-5 border border-border">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FS</span>
            </div>
            <span className="font-semibold text-foreground">Folkets Storting</span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg mb-4 leading-tight">{title}</h3>

          {/* Result Bar */}
          {total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-vote-for">Enig</span>
                <span className="text-vote-mot">Uenig</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
                {forPercent > 0 && (
                  <div 
                    className="bg-vote-for h-full transition-all duration-500"
                    style={{ width: `${forPercent}%` }}
                  />
                )}
                {motPercent > 0 && (
                  <div 
                    className="bg-vote-mot h-full transition-all duration-500"
                    style={{ width: `${motPercent}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{forPercent}%</span>
                <span>{motPercent}%</span>
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Vær den første til å stemme!
            </p>
          )}
        </div>

        {/* Share Options */}
        <div className="space-y-3 mt-2">
          <p className="text-sm text-muted-foreground text-center">Del på</p>
          
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className="h-10 w-10 rounded-full bg-[#1DA1F2] flex items-center justify-center">
                <Twitter className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">X</span>
            </button>

            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">Facebook</span>
            </button>

            <button
              onClick={shareToMessages}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className="h-10 w-10 rounded-full bg-vote-for flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">Melding</span>
            </button>

            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press"
            >
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                copied ? "bg-vote-for" : "bg-muted-foreground"
              )}>
                {copied ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <Link2 className="h-5 w-5 text-white" />
                )}
              </div>
              <span className="text-xs font-medium">{copied ? 'Kopiert!' : 'Kopier'}</span>
            </button>
          </div>
        </div>

        {/* Main Share Button */}
        <Button
          onClick={shareToMessages}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl mt-2"
        >
          <Share2 className="h-5 w-5 mr-2" />
          Del resultat
        </Button>
      </DialogContent>
    </Dialog>
  );
}

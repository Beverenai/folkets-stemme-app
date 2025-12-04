import { useState } from 'react';
import { Share2, Check, Users, Building2, ExternalLink } from 'lucide-react';
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
  const [showOGPreview, setShowOGPreview] = useState(false);

  const total = forCount + motCount + avholdendeCount;
  const forPercent = total > 0 ? Math.round((forCount / total) * 100) : 0;
  const motPercent = total > 0 ? Math.round((motCount / total) * 100) : 0;
  const publicMajority = forPercent > motPercent ? 'for' : forPercent < motPercent ? 'mot' : 'likt';

  const hasStortingetVotes = stortingetFor != null && stortingetMot != null && (stortingetFor > 0 || stortingetMot > 0);
  const stortingetTotal = (stortingetFor || 0) + (stortingetMot || 0);
  const stortingetForPercent = stortingetTotal > 0 ? Math.round(((stortingetFor || 0) / stortingetTotal) * 100) : 0;
  const stortingetMotPercent = stortingetTotal > 0 ? Math.round(((stortingetMot || 0) / stortingetTotal) * 100) : 0;
  const stortingetMajority = (stortingetFor || 0) > (stortingetMot || 0) ? 'for' : (stortingetFor || 0) < (stortingetMot || 0) ? 'mot' : 'likt';
  const vedtatt = (stortingetFor || 0) > (stortingetMot || 0);

  const isAgreement = publicMajority === stortingetMajority;

  const id = sakId || voteringId;
  const ogImageUrl = id 
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?id=${id}&type=${type}${kategori ? `&kategori=${encodeURIComponent(kategori)}` : ''}`
    : null;

  const shareText = hasStortingetVotes
    ? `${title}\n\n📊 Folkets mening:\n✅ ${forPercent}% For\n❌ ${motPercent}% Mot\n\n🏛️ Stortingets vedtak: ${vedtatt ? 'Vedtatt' : 'Forkastet'} (${stortingetFor}–${stortingetMot})\n\n${isAgreement ? '✓ Folket er ENIG med Stortinget' : '✗ Folket er UENIG med Stortinget'}\n\nStem selv på Folketinget!`
    : `${title}\n\n📊 Folkets mening:\n✅ ${forPercent}% For\n❌ ${motPercent}% Mot\n\nStem selv på Folketinget!`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank', 'width=550,height=420');
  };

  const shareToMessages = async () => {
    try {
      await navigator.share({ title: 'Folketinget', text: shareText, url: url });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Del sak</DialogTitle>
        </DialogHeader>

        {ogImageUrl && (
          <button
            onClick={() => setShowOGPreview(!showOGPreview)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{showOGPreview ? 'Skjul' : 'Se'} forhåndsvisning ved deling</span>
          </button>
        )}

        {showOGPreview && ogImageUrl && (
          <div className="aspect-[1200/630] rounded-xl overflow-hidden border border-border bg-secondary mb-4">
            <img src={ogImageUrl} alt="Forhåndsvisning" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="bg-background rounded-xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">FS</span>
            </div>
            <span className="font-semibold text-foreground">Folketinget</span>
          </div>

          <h3 className="font-bold text-lg leading-tight">{title}</h3>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Folket</span>
            </div>
            {total > 0 ? (
              <>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-vote-for">For {forPercent}%</span>
                  <span className="text-vote-mot">Mot {motPercent}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
                  {forPercent > 0 && <div className="bg-vote-for h-full" style={{ width: `${forPercent}%` }} />}
                  {motPercent > 0 && <div className="bg-vote-mot h-full" style={{ width: `${motPercent}%` }} />}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen stemmer ennå</p>
            )}
          </div>

          {hasStortingetVotes && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Stortinget</span>
                </div>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", vedtatt ? "bg-vote-for/20 text-vote-for" : "bg-vote-mot/20 text-vote-mot")}>
                  {vedtatt ? 'Vedtatt' : 'Forkastet'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-vote-for">For {stortingetFor}</span>
                <span className="text-vote-mot">Mot {stortingetMot}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-secondary flex">
                {stortingetForPercent > 0 && <div className="bg-vote-for h-full" style={{ width: `${stortingetForPercent}%` }} />}
                {stortingetMotPercent > 0 && <div className="bg-vote-mot h-full" style={{ width: `${stortingetMotPercent}%` }} />}
              </div>
            </div>
          )}

          {hasStortingetVotes && total > 0 && (
            <div className={cn("flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium", isAgreement ? "bg-vote-for/10 text-vote-for" : "bg-vote-mot/10 text-vote-mot")}>
              {isAgreement ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Folket er ENIG med Stortinget</span>
                </>
              ) : (
                <>
                  <span className="text-lg">⚠️</span>
                  <span>Folket er UENIG med Stortinget</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 mt-2">
          <p className="text-sm text-muted-foreground text-center">Del på</p>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={shareToTwitter} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press">
              <div className="h-10 w-10 rounded-full bg-[#000000] flex items-center justify-center">
                <span className="text-white font-bold text-lg">𝕏</span>
              </div>
              <span className="text-xs font-medium">X</span>
            </button>
            <button onClick={shareToFacebook} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press">
              <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                <span className="text-white font-bold text-lg">f</span>
              </div>
              <span className="text-xs font-medium">Facebook</span>
            </button>
            <button onClick={shareToMessages} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press">
              <div className="h-10 w-10 rounded-full bg-vote-for flex items-center justify-center">
                <span className="text-white text-lg">💬</span>
              </div>
              <span className="text-xs font-medium">Melding</span>
            </button>
            <button onClick={copyLink} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors ios-press">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-colors", copied ? "bg-vote-for" : "bg-muted-foreground")}>
                {copied ? <Check className="h-5 w-5 text-white" /> : <span className="text-white text-lg">🔗</span>}
              </div>
              <span className="text-xs font-medium">{copied ? 'Kopiert!' : 'Kopier'}</span>
            </button>
          </div>
        </div>

        <Button onClick={shareToMessages} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl mt-2">
          <Share2 className="h-5 w-5 mr-2" />
          Del resultat
        </Button>
      </DialogContent>
    </Dialog>
  );
}

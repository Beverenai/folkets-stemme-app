import { getSakBildeUrl, getKategoriConfig } from '@/lib/kategoriConfig';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Users, Share2, Building2 } from 'lucide-react';
import ResultBar from '@/components/ResultBar';
import PartiBreakdown from '@/components/PartiBreakdown';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface PartiStemme {
  parti_forkortelse: string;
  stemmer_for: number;
  stemmer_mot: number;
  sak_id: string;
}

interface ResultatKortProps {
  id: string;
  sakId: string | null;
  displayText: string;
  kategori: string | null;
  vedtatt: boolean | null;
  voteringDato: string | null;
  resultatFor: number;
  resultatMot: number;
  resultatAvholdende: number;
  folkeStemmer: { stemme: string }[];
  partiStemmer?: PartiStemme[];
  isActive?: boolean;
  onShare: () => void;
}

export default function ResultatKort({
  id,
  sakId,
  displayText,
  kategori,
  vedtatt,
  voteringDato,
  resultatFor,
  resultatMot,
  resultatAvholdende,
  folkeStemmer,
  partiStemmer,
  isActive = false,
  onShare,
}: ResultatKortProps) {
  const bildeUrl = getSakBildeUrl(kategori, sakId || id);
  const kategoriConfig = getKategoriConfig(kategori);

  // Calculate folk votes
  const folkeFor = folkeStemmer.filter(s => s.stemme === 'for').length;
  const folkeMot = folkeStemmer.filter(s => s.stemme === 'mot').length;
  const folkeAvholdende = folkeStemmer.filter(s => s.stemme === 'avholdende').length;
  const totalFolke = folkeFor + folkeMot + folkeAvholdende;

  // Calculate agreement
  const getEnighet = () => {
    if (totalFolke === 0) return null;
    const folkFlertallFor = folkeFor > folkeMot;
    const stortingetFor = vedtatt === true;
    return folkFlertallFor === stortingetFor;
  };

  const enighet = getEnighet();

  return (
    <div 
      className={cn(
        "relative h-full w-full rounded-3xl overflow-hidden transition-all duration-500",
        isActive 
          ? "scale-100 stem-card-active" 
          : "scale-[0.88] opacity-60"
      )}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src={bildeUrl} 
          alt="" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Category gradient overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t",
          kategoriConfig.gradient,
          "opacity-70"
        )} />
        {/* Dark gradient for text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col p-5 overflow-y-auto">
        {/* Top metadata */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white/70">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Stortinget</span>
          </div>
          {voteringDato && (
            <span className="text-xs text-white/60">
              {format(new Date(voteringDato), 'd. MMM yyyy', { locale: nb })}
            </span>
          )}
        </div>

        {/* Status badge + kategori */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
            vedtatt 
              ? 'bg-vote-for/20 text-vote-for' 
              : 'bg-vote-mot/20 text-vote-mot'
          )}>
            {vedtatt ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {vedtatt ? 'Vedtatt' : 'Ikke vedtatt'}
          </span>
          {kategori && (
            <span className="inline-flex px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-primary text-xs font-semibold">
              {kategori}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white leading-tight mb-4 line-clamp-3">
          {displayText}
        </h2>

        {/* Results section */}
        <div className="space-y-3 mb-4 bg-black/30 backdrop-blur-sm rounded-2xl p-3">
          {/* Folket */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Folket
              </span>
              {totalFolke > 0 && (
                <span className="text-white/60">({totalFolke} stemmer)</span>
              )}
            </div>
            {totalFolke > 0 ? (
              <ResultBar
                forCount={folkeFor}
                motCount={folkeMot}
                avholdendeCount={folkeAvholdende}
                showPercentages
              />
            ) : (
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-white/60">Ingen stemmer fra folket</p>
              </div>
            )}
          </div>

          {/* Stortinget */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80">🏛️ Stortinget</span>
              {(resultatFor > 0 || resultatMot > 0) && (
                <span className="text-white/60">
                  {resultatFor} - {resultatMot}
                </span>
              )}
            </div>
            {(resultatFor > 0 || resultatMot > 0) && (
              <ResultBar
                forCount={resultatFor}
                motCount={resultatMot}
                avholdendeCount={resultatAvholdende}
                showPercentages
              />
            )}
          </div>
        </div>

        {/* Parti breakdown */}
        {partiStemmer && partiStemmer.length > 0 && (
          <div className="mb-4 bg-black/30 backdrop-blur-sm rounded-2xl p-3">
            <PartiBreakdown partiStemmer={partiStemmer} />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-h-2" />

        {/* Enighet badge */}
        {enighet !== null && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium mb-4',
            enighet ? 'bg-vote-for/20 text-vote-for' : 'bg-vote-mot/20 text-vote-mot'
          )}>
            {enighet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {enighet ? 'Stortinget stemte som folket' : 'Stortinget stemte mot folket'}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={onShare}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Del
          </Button>
          <Button asChild size="sm" className="flex-1 h-11 rounded-xl">
            <Link to={`/votering/${id}`}>
              Se detaljer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

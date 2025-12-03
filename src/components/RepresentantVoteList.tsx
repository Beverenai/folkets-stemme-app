import { Link } from 'react-router-dom';
import { getPartiConfig } from '@/lib/partiConfig';
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { useState } from 'react';

interface RepresentantVote {
  id: string;
  stemme: string;
  representant: {
    id: string;
    fornavn: string;
    etternavn: string;
    parti_forkortelse: string | null;
    bilde_url: string | null;
  };
}

interface RepresentantVoteListProps {
  votes: RepresentantVote[];
}

export default function RepresentantVoteList({ votes }: RepresentantVoteListProps) {
  const [activeTab, setActiveTab] = useState<'for' | 'mot' | 'ikke_tilstede'>('for');

  if (!votes || votes.length === 0) {
    return null;
  }

  const forVotes = votes.filter(v => v.stemme === 'for');
  const motVotes = votes.filter(v => v.stemme === 'mot');
  const ikkeTilstedeVotes = votes.filter(v => v.stemme === 'ikke_tilstede' || v.stemme === 'avholdende');

  const tabs = [
    { key: 'for' as const, label: 'For', count: forVotes.length, icon: ThumbsUp, color: 'text-vote-for' },
    { key: 'mot' as const, label: 'Mot', count: motVotes.length, icon: ThumbsDown, color: 'text-vote-mot' },
    { key: 'ikke_tilstede' as const, label: 'Avstår', count: ikkeTilstedeVotes.length, icon: Minus, color: 'text-vote-avholdende' },
  ];

  const activeVotes = activeTab === 'for' ? forVotes : activeTab === 'mot' ? motVotes : ikkeTilstedeVotes;

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ios-press ${
              activeTab === tab.key
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${tab.color}`} />
            <span>{tab.label}</span>
            <span className="ml-1 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Representative list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {activeVotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ingen representanter
          </p>
        ) : (
          activeVotes.map(vote => {
            const config = getPartiConfig(vote.representant.parti_forkortelse);
            return (
              <Link
                key={vote.id}
                to={`/representant/${vote.representant.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors ios-press"
              >
                {/* Avatar */}
                <div className="relative">
                  {vote.representant.bilde_url ? (
                    <img
                      src={vote.representant.bilde_url}
                      alt={`${vote.representant.fornavn} ${vote.representant.etternavn}`}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                      {vote.representant.fornavn[0]}{vote.representant.etternavn[0]}
                    </div>
                  )}
                  {/* Party badge */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-background"
                    style={{ backgroundColor: config.farge, color: config.tekstFarge }}
                  >
                    {config.forkortelse.slice(0, 1)}
                  </div>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {vote.representant.fornavn} {vote.representant.etternavn}
                  </p>
                  <p className="text-xs text-muted-foreground">{config.navn}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

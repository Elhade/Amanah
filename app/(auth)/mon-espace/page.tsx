'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Users, Share2, Trophy, HandHeart, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import type { Donation, Leader } from '@/types';

interface LeaderRanking {
  leader: Leader;
  total: number;
  count: number;
}

export default function MonEspacePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [myLeader, setMyLeader] = useState<Leader | null>(null);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [ranking, setRanking] = useState<LeaderRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchData(); }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    const [leaderRes, allLeadersRes, donationsRes] = await Promise.all([
      supabase.from('leaders').select('*').eq('user_id', profile.id).maybeSingle(),
      supabase.from('leaders').select('*'),
      supabase.from('donations').select('*, donors(nom), projects(nom)').order('created_at', { ascending: false }),
    ]);
    const leader = leaderRes.data as Leader | null;
    setMyLeader(leader);
    const allDonations = (donationsRes.data || []) as unknown as Donation[];
    setMyDonations(leader ? allDonations.filter(d => d.leader_id === leader.id) : []);
    const leaders = (allLeadersRes.data || []) as Leader[];
    setRanking(leaders.map(l => {
      const lDons = allDonations.filter(d => d.leader_id === l.id);
      return { leader: l, total: lDons.reduce((s, d) => s + d.montant, 0), count: lDons.length };
    }).sort((a, b) => b.total - a.total));
    setLoading(false);
  };

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`;
  const myTotal = myDonations.reduce((s, d) => s + d.montant, 0);
  const uniqueDonors = new Set(myDonations.map(d => d.donor_id).filter(Boolean)).size;
  const myRank = myLeader ? ranking.findIndex(r => r.leader.id === myLeader.id) + 1 : 0;
  const donationLink = myLeader ? `${typeof window !== 'undefined' ? window.location.origin : ''}/don?ref=${myLeader.slug}` : '';

  const handleCopy = () => {
    if (donationLink) {
      navigator.clipboard.writeText(donationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Espace</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue, {myLeader?.nom_affichage || profile?.nom}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total collecté" value={fmt(myTotal)} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Donateurs" value={uniqueDonors} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Mon classement" value={`#${myRank}`} icon={Trophy} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      {myLeader && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-emerald-200 text-sm font-medium mb-1">Mon lien de collecte</p>
              <p className="text-white font-mono text-sm break-all opacity-90">{donationLink}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
              <a
                href={`https://wa.me/?text=Soutenez%20notre%20collecte%20%3A%20${encodeURIComponent(donationLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-emerald-600" />
            Mes dons récents
          </h2>
          {myDonations.length === 0 ? (
            <div className="text-center py-6">
              <HandHeart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucun don enregistré</p>
              <button onClick={() => router.push('/ajouter-don')} className="mt-2 text-emerald-600 text-sm font-medium hover:text-emerald-700">
                Ajouter un don →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myDonations.slice(0, 6).map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.donors?.nom || 'Anonyme'}</p>
                    <p className="text-xs text-gray-400">{d.projects?.nom || '—'} · {new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600 text-sm">{fmt(d.montant)}</span>
                    <Badge status={d.statut} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Classement
          </h2>
          <div className="space-y-3">
            {ranking.map(({ leader, total, count }, i) => {
              const isMe = myLeader && leader.id === myLeader.id;
              return (
                <div key={leader.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isMe ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-gray-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-amber-700/30 text-amber-800' : 'bg-gray-200 text-gray-600'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isMe ? 'text-emerald-800' : 'text-gray-800'}`}>
                      {leader.nom_affichage} {isMe && <span className="text-xs text-emerald-600">(moi)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{count} don{count > 1 ? 's' : ''}</p>
                  </div>
                  <p className="font-bold text-sm text-gray-900">{fmt(total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

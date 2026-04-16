'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Copy, Check, CreditCard as Edit3, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Leader, Profile } from '@/lib/types';

export default function ResponsablesPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [donationCounts, setDonationCounts] = useState<Record<string, { count: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nom_affichage: '', slug: '', userId: '' });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'super_admin') router.replace('/dashboard');
  }, [authLoading, profile, router]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [leadersRes, profilesRes, donationsRes] = await Promise.all([
      supabase.from('leaders').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('donations').select('leader_id, montant'),
    ]);
    setLeaders((leadersRes.data || []) as Leader[]);
    setProfiles((profilesRes.data || []) as Profile[]);
    const counts: Record<string, { count: number; total: number }> = {};
    (donationsRes.data || []).forEach((d: { leader_id: string | null; montant: number }) => {
      if (d.leader_id) {
        if (!counts[d.leader_id]) counts[d.leader_id] = { count: 0, total: 0 };
        counts[d.leader_id].count++;
        counts[d.leader_id].total += d.montant;
      }
    });
    setDonationCounts(counts);
    setLoading(false);
  };

  const slugify = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = { nom_affichage: form.nom_affichage, slug: form.slug || slugify(form.nom_affichage), user_id: form.userId || null };
    if (editingId) await supabase.from('leaders').update(data).eq('id', editingId);
    else await supabase.from('leaders').insert(data);
    setForm({ nom_affichage: '', slug: '', userId: '' });
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    fetchData();
  };

  const handleEdit = (l: Leader) => {
    setForm({ nom_affichage: l.nom_affichage, slug: l.slug, userId: l.user_id || '' });
    setEditingId(l.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce responsable ?')) return;
    await supabase.from('leaders').delete().eq('id', id);
    fetchData();
  };

  const copyLink = (slug: string, id: string) => {
    const link = `${window.location.origin}/don?ref=${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Responsables</h1>
          <p className="text-gray-500 text-sm mt-1">{leaders.length} responsable{leaders.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nom_affichage: '', slug: '', userId: '' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Nouveau responsable
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? 'Modifier' : 'Nouveau responsable'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom d&apos;affichage *</label>
              <input
                type="text"
                value={form.nom_affichage}
                onChange={e => { const v = e.target.value; setForm(f => ({ ...f, nom_affichage: v, slug: f.slug || slugify(v) })); }}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all text-sm"
                placeholder="Ex: Frère Ahmed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug (URL)</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:border-emerald-400 transition-all">
                <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200">/don?ref=</span>
                <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="flex-1 px-3 py-3 text-sm focus:outline-none" placeholder="frere-ahmed" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Compte utilisateur</label>
              <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 bg-white text-sm">
                <option value="">— Aucun compte lié —</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.nom || p.email}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-60">
                <Check className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Valider'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all">
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leaders.map(l => {
          const stats = donationCounts[l.id] || { count: 0, total: 0 };
          const linkedProfile = profiles.find(p => p.id === l.user_id);
          return (
            <div key={l.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {l.nom_affichage[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{l.nom_affichage}</h3>
                    <p className="text-xs text-gray-400">{linkedProfile ? (linkedProfile.nom || linkedProfile.email) : 'Sans compte'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(l)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(l.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Total collecté</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{fmt(stats.total)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Nombre de dons</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{stats.count} don{stats.count > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => copyLink(l.slug, l.id)} className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium transition-all">
                {copiedId === l.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedId === l.id ? 'Lien copié !' : 'Copier le lien de collecte'}
              </button>
            </div>
          );
        })}
        {leaders.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun responsable créé</p>
          </div>
        )}
      </div>
    </div>
  );
}

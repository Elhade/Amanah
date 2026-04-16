'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Plus, Target, Trash2, CreditCard as Edit3, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Project } from '@/lib/types';

export default function ProjetsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [donationTotals, setDonationTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', objectif: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'super_admin') router.replace('/dashboard');
  }, [authLoading, profile, router]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [projRes, donRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('donations').select('project_id, montant'),
    ]);
    setProjects((projRes.data || []) as Project[]);
    const totals: Record<string, number> = {};
    (donRes.data || []).forEach((d: { project_id: string | null; montant: number }) => {
      if (d.project_id) totals[d.project_id] = (totals[d.project_id] || 0) + d.montant;
    });
    setDonationTotals(totals);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data = { nom: form.nom, description: form.description, objectif: parseFloat(form.objectif) || 0 };
    if (editingId) await supabase.from('projects').update(data).eq('id', editingId);
    else await supabase.from('projects').insert(data);
    setForm({ nom: '', description: '', objectif: '' });
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    fetchData();
  };

  const handleEdit = (p: Project) => {
    setForm({ nom: p.nom, description: p.description, objectif: p.objectif > 0 ? p.objectif.toString() : '' });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce projet ?')) return;
    await supabase.from('projects').delete().eq('id', id);
    fetchData();
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
          <h1 className="text-2xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-500 text-sm mt-1">{projects.length} projet{projects.length > 1 ? 's' : ''} actif{projects.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nom: '', description: '', objectif: '' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
          <h2 className="font-semibold text-gray-900 mb-4">{editingId ? 'Modifier le projet' : 'Nouveau projet'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du projet *</label>
              <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all text-sm" placeholder="Ex: Nourrir les nécessiteux" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all text-sm resize-none" rows={3} placeholder="Description du projet..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Objectif (€)</label>
              <input type="number" value={form.objectif} onChange={e => setForm(f => ({ ...f, objectif: e.target.value }))} min="0" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all text-sm" placeholder="0 (optionnel)" />
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
        {projects.map(p => {
          const collected = donationTotals[p.id] || 0;
          return (
            <div key={p.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.nom}</h3>
                    <p className="text-xs text-gray-400">{fmt(collected)} collectés</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {p.description && <p className="text-sm text-gray-500 mb-4">{p.description}</p>}
              {p.objectif > 0 && (
                <div>
                  <ProgressBar value={collected} max={p.objectif} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Target className="w-3 h-3" />Objectif: {fmt(p.objectif)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
            <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun projet créé</p>
          </div>
        )}
      </div>
    </div>
  );
}

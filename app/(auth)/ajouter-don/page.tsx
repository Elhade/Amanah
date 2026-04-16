'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandHeart, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { Project, Leader } from '@/lib/types';

export default function AjouterDonPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [myLeader, setMyLeader] = useState<Leader | null>(null);
  const [form, setForm] = useState({ donorName: '', montant: '', projectId: '', leaderId: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, [profile]);

  const fetchData = async () => {
    const [projectsRes, leadersRes] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('leaders').select('*'),
    ]);
    const loadedProjects = (projectsRes.data || []) as Project[];
    const loadedLeaders = (leadersRes.data || []) as Leader[];
    setProjects(loadedProjects);
    setLeaders(loadedLeaders);
    if (profile) {
      const found = loadedLeaders.find(l => l.user_id === profile.id) || null;
      setMyLeader(found);
      if (found) setForm(f => ({ ...f, leaderId: found.id }));
    }
    if (loadedProjects.length > 0) setForm(f => ({ ...f, projectId: loadedProjects[0].id }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const montant = parseFloat(form.montant);
    if (!montant || montant <= 0) { setError('Le montant doit être supérieur à 0.'); setLoading(false); return; }
    const { data: donor, error: donorErr } = await supabase.from('donors').insert({ nom: form.donorName.trim() || 'Anonyme' }).select().single();
    if (donorErr) { setError("Erreur lors de l'enregistrement du donateur."); setLoading(false); return; }
    const { error: donErr } = await supabase.from('donations').insert({
      donor_id: donor.id,
      leader_id: form.leaderId || null,
      project_id: form.projectId || null,
      montant,
      methode: 'cash',
      statut: 'cash_validated',
    });
    if (donErr) { setError("Erreur lors de l'enregistrement du don."); } else {
      setSuccess(true);
      setForm(f => ({ ...f, donorName: '', montant: '' }));
      setTimeout(() => setSuccess(false), 4000);
    }
    setLoading(false);
  };

  const isAdmin = profile?.role === 'super_admin';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajouter un don</h1>
        <p className="text-gray-500 text-sm mt-1">Enregistrer un don en espèces</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Don enregistré avec succès !</p>
            <button onClick={() => router.push('/historique')} className="text-sm text-emerald-600 hover:underline">Voir l&apos;historique →</button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du donateur</label>
            <input
              type="text"
              value={form.donorName}
              onChange={e => setForm(f => ({ ...f, donorName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all"
              placeholder="Nom du donateur (optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Montant <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type="number"
                value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                required
                min="1"
                step="0.01"
                className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all text-lg font-semibold"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[5, 10, 20, 50, 100].map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, montant: amount.toString() }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${form.montant === amount.toString() ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {amount}€
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Projet <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 gap-2">
              {projects.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, projectId: p.id }))}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${form.projectId === p.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.projectId === p.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                    {form.projectId === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${form.projectId === p.id ? 'text-emerald-800' : 'text-gray-800'}`}>{p.nom}</p>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Responsable</label>
              <select
                value={form.leaderId}
                onChange={e => setForm(f => ({ ...f, leaderId: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all bg-white"
              >
                <option value="">— Aucun responsable —</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.nom_affichage}</option>)}
              </select>
            </div>
          )}

          {!isAdmin && myLeader && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <HandHeart className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">Ce don sera attribué à <span className="font-semibold">{myLeader.nom_affichage}</span></p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.montant || !form.projectId}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enregistrement...
              </>
            ) : (
              <>
                <HandHeart className="w-4 h-4" />
                Valider le don
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

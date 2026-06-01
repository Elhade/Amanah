'use client';

import { useEffect, useRef, useState } from 'react';
import {
  UserCheck, UserPlus, Search, RefreshCw,
  User, Phone, Hash, Landmark, Mail,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { SectionHeader, Spinner } from './shared';
import {
  checkExistingDonorAction,
  checkPseudoAvailableAction,
  checkEmailAvailableAction,
} from '@/actions/donor.actions';

export type AccountStatus = 'undecided' | 'existing' | 'new';

type CheckState = 'idle' | 'checking' | 'ok' | 'error';

interface Props {
  accountStatus: AccountStatus;
  onSelectStatus: (status: 'existing' | 'new') => void;
  existingIdentifier: string;
  onIdentifierChange: (val: string) => void;
  onValidateExisting: () => void;
  pseudo: string;
  name: string;
  email: string;
  phone: string;
  onPseudoChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onSubmitNew: () => void;
  submitting: boolean;
  amount: number;
  onBack: () => void;
}

function FieldIndicator({ state }: { state: CheckState }) {
  if (state === 'idle') return null;
  if (state === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
  if (state === 'ok') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function FieldHint({ state, ok, error }: { state: CheckState; ok: string; error: string }) {
  if (state === 'ok') return <p className="text-xs text-emerald-600 mt-1">{ok}</p>;
  if (state === 'error') return <p className="text-xs text-red-500 mt-1">{error}</p>;
  return null;
}

const DEBOUNCE_MS = 600;

export function AccountCheckStep({
  accountStatus, onSelectStatus,
  existingIdentifier, onIdentifierChange,
  onValidateExisting,
  pseudo, name, email, phone,
  onPseudoChange, onNameChange, onEmailChange, onPhoneChange,
  onSubmitNew,
  submitting, amount,
}: Props) {
  // ─── Compte existant ────────────────────────────────────────────────────────
  const [identifierState, setIdentifierState] = useState<CheckState>('idle');
  const [foundName, setFoundName] = useState('');
  const identifierTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Nouveau compte ─────────────────────────────────────────────────────────
  const [pseudoState, setPseudoState] = useState<CheckState>('idle');
  const [emailNewState, setEmailNewState] = useState<CheckState>('idle');
  const pseudoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Réinitialise tous les états de vérification quand l'utilisateur change de mode
  useEffect(() => {
    setIdentifierState('idle');
    setFoundName('');
    setPseudoState('idle');
    setEmailNewState('idle');
    if (identifierTimer.current) clearTimeout(identifierTimer.current);
    if (pseudoTimer.current) clearTimeout(pseudoTimer.current);
    if (emailTimer.current) clearTimeout(emailTimer.current);
  }, [accountStatus]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (identifierTimer.current) clearTimeout(identifierTimer.current);
      if (pseudoTimer.current) clearTimeout(pseudoTimer.current);
      if (emailTimer.current) clearTimeout(emailTimer.current);
    };
  }, []);

  // ─── Handlers avec debounce ─────────────────────────────────────────────────

  const handleIdentifierChange = (val: string) => {
    onIdentifierChange(val);
    setIdentifierState('idle');
    setFoundName('');
    if (identifierTimer.current) clearTimeout(identifierTimer.current);
    if (val.trim().length < 2) return;
    identifierTimer.current = setTimeout(async () => {
      setIdentifierState('checking');
      const result = await checkExistingDonorAction(val);
      if (result.found) {
        setFoundName(result.nom);
        setIdentifierState('ok');
      } else {
        setIdentifierState('error');
      }
    }, DEBOUNCE_MS);
  };

  const handlePseudoChange = (val: string) => {
    const normalized = val.toLowerCase().replace(/\s+/g, '_');
    onPseudoChange(normalized);
    setPseudoState('idle');
    if (pseudoTimer.current) clearTimeout(pseudoTimer.current);
    if (normalized.trim().length < 3) return;
    pseudoTimer.current = setTimeout(async () => {
      setPseudoState('checking');
      const result = await checkPseudoAvailableAction(normalized);
      setPseudoState(result.available ? 'ok' : 'error');
    }, DEBOUNCE_MS);
  };

  const handleEmailNewChange = (val: string) => {
    onEmailChange(val);
    setEmailNewState('idle');
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!/\S+@\S+\.\S+/.test(val.trim())) return;
    emailTimer.current = setTimeout(async () => {
      setEmailNewState('checking');
      const result = await checkEmailAvailableAction(val);
      setEmailNewState(result.available ? 'ok' : 'error');
    }, DEBOUNCE_MS);
  };

  const canSubmitNew =
    !!pseudo.trim() && !!name.trim() && !!email.trim() && amount > 0;

  return (
    <div className="space-y-5">
      <SectionHeader icon={<RefreshCw className="w-4 h-4" />} label="Don récurrent par prélèvement SEPA" />

      <p className="text-sm text-gray-500 leading-relaxed">
        Pour mettre en place un prélèvement récurrent, nous avons besoin d&apos;un compte à votre nom.
        Avez-vous déjà un compte chez nous ?
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSelectStatus('existing')}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
            accountStatus === 'existing'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
          }`}
        >
          <UserCheck className={`w-6 h-6 ${accountStatus === 'existing' ? 'text-emerald-600' : 'text-gray-400'}`} />
          Oui, j&apos;ai un compte
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus('new')}
          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
            accountStatus === 'new'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
          }`}
        >
          <UserPlus className={`w-6 h-6 ${accountStatus === 'new' ? 'text-emerald-600' : 'text-gray-400'}`} />
          Non, créer un compte
        </button>
      </div>

      {/* ── Compte existant ─────────────────────────────────────────────────── */}
      {accountStatus === 'existing' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Votre pseudo ou adresse e-mail *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={existingIdentifier}
                onChange={e => handleIdentifierChange(e.target.value)}
                className="w-full pl-9 pr-9 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="votre_pseudo ou email@..."
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <FieldIndicator state={identifierState} />
              </div>
            </div>
            <FieldHint
              state={identifierState}
              ok={`Compte trouvé : ${foundName}`}
              error="Aucun compte trouvé avec cet identifiant."
            />
          </div>

          <button
            type="button"
            onClick={onValidateExisting}
            disabled={submitting || identifierState !== 'ok' || amount <= 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner />Vérification...</>
              : <><RefreshCw className="w-4 h-4" />Valider {amount > 0 ? `${amount.toLocaleString('fr-FR')} €` : 'mon prélèvement'}</>
            }
          </button>
        </div>
      )}

      {/* ── Nouveau compte ──────────────────────────────────────────────────── */}
      {accountStatus === 'new' && (
        <div className="space-y-3">

          {/* Pseudo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Pseudo * <span className="text-gray-400 font-normal">(unique et permanent)</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={pseudo}
                onChange={e => handlePseudoChange(e.target.value)}
                className="w-full pl-9 pr-9 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="votre_pseudo"
                autoComplete="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <FieldIndicator state={pseudoState} />
              </div>
            </div>
            <FieldHint
              state={pseudoState}
              ok="Pseudo disponible"
              error="Ce pseudo est déjà utilisé."
            />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom complet *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={e => onNameChange(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="Prénom Nom"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Adresse e-mail *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => handleEmailNewChange(e.target.value)}
                className="w-full pl-9 pr-9 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="exemple@email.com"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <FieldIndicator state={emailNewState} />
              </div>
            </div>
            <FieldHint
              state={emailNewState}
              ok="Adresse disponible"
              error="Un compte existe déjà avec cette adresse. Sélectionnez « Oui, j'ai un compte »."
            />
            {emailNewState === 'idle' && (
              <p className="text-xs text-gray-400 mt-1">Le reçu vous sera envoyé par e-mail.</p>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Numéro de téléphone <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={e => onPhoneChange(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>

          {/* Info IBAN */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Landmark className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Votre IBAN sera saisi de manière sécurisée à l&apos;étape suivante, directement via Stripe. Il n&apos;est jamais stocké sur nos serveurs.
            </p>
          </div>

          <button
            type="button"
            onClick={onSubmitNew}
            disabled={submitting || !canSubmitNew}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner />Enregistrement...</>
              : <><RefreshCw className="w-4 h-4" />Valider {amount > 0 ? `${amount.toLocaleString('fr-FR')} €` : 'mon prélèvement'}</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  UserCheck, UserPlus, Search, RefreshCw,
  Hash,
  CheckCircle, XCircle, Loader2, KeyRound,
} from 'lucide-react';
import { SectionHeader, Spinner } from './shared';
import {
  checkPseudoAvailableAction,
} from '@/actions/donor.actions';

export type AccountStatus = 'undecided' | 'existing' | 'new';

type CheckState = 'idle' | 'checking' | 'ok' | 'error';

interface Props {
  accountStatus: AccountStatus;
  onSelectStatus: (status: 'existing' | 'new') => void;
  // Compte existant
  existingIdentifier: string;
  existingPin: string;
  onIdentifierChange: (val: string) => void;
  onExistingPinChange: (val: string) => void;
  onValidateExisting: () => void;
  // Nouveau compte
  pseudo: string;
  pin: string;
  onPseudoChange: (val: string) => void;
  onPinChange: (val: string) => void;
  onSubmitNew: () => void;
  submitting: boolean;
  amount?: number;
  submitLabel?: string;
  hideSelection?: boolean;
  hideHeader?: boolean;
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
  existingIdentifier, existingPin, onIdentifierChange, onExistingPinChange, onValidateExisting,
  pseudo, pin,
  onPseudoChange, onPinChange,
  onSubmitNew,
  submitting, amount = 0, submitLabel,
  hideSelection = false,
  hideHeader = false,
}: Props) {
  const [pseudoState, setPseudoState] = useState<CheckState>('idle');
  const [pinConfirm, setPinConfirm] = useState('');
  const pseudoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveStatus = hideSelection && accountStatus === 'undecided' ? 'new' : accountStatus;

  useEffect(() => {
    setPseudoState('idle');
    setPinConfirm('');
    if (pseudoTimer.current) clearTimeout(pseudoTimer.current);
  }, [accountStatus]);

  useEffect(() => {
    return () => {
      if (pseudoTimer.current) clearTimeout(pseudoTimer.current);
    };
  }, []);

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

  const canSubmitNew =
    !!pseudo.trim() && pseudoState === 'ok' &&
    pin.length === 4 &&
    pin === pinConfirm;

  const canSubmitExisting =
    !!existingIdentifier.trim() && existingPin.length === 4;

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <SectionHeader icon={<RefreshCw className="w-4 h-4" />} label="Don récurrent par prélèvement SEPA" />
      )}

      {!hideSelection && (
        <>
          <p className="text-sm text-gray-500 leading-relaxed">
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
        </>
      )}

      {/* ── Compte existant ─────────────────────────────────────────────────── */}
      {effectiveStatus === 'existing' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Votre pseudo ou adresse e-mail *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={existingIdentifier}
                onChange={e => onIdentifierChange(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="votre_pseudo ou email@..."
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Code PIN *</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={existingPin}
                onChange={e => onExistingPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm tracking-widest"
                placeholder="••••"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onValidateExisting}
            disabled={submitting || !canSubmitExisting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner />Vérification...</>
              : <><RefreshCw className="w-4 h-4" />{submitLabel ?? (amount > 0 ? `Valider ${amount.toLocaleString('fr-FR')} €` : 'Valider mon prélèvement')}</>
            }
          </button>

          {hideSelection && (
            <button
              type="button"
              onClick={() => onSelectStatus('new')}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Créer un nouveau compte →
            </button>
          )}
        </div>
      )}

      {/* ── Nouveau compte ──────────────────────────────────────────────────── */}
      {effectiveStatus === 'new' && (
        <div className="space-y-3">

          {/* Pseudo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Pseudo * <span className="text-gray-400 font-normal">(pour vous reconnaître à votre prochain don)</span>
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
            <FieldHint state={pseudoState} ok="Pseudo disponible" error="Ce pseudo est déjà utilisé." />
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Code PIN * <span className="text-gray-400 font-normal">(4 chiffres, pour vos prochains dons)</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm tracking-widest"
                placeholder="••••"
              />
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirmer le code PIN *</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`w-full pl-9 pr-3 py-3 border-2 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none transition-all text-sm tracking-widest ${
                  pinConfirm.length === 4
                    ? pin === pinConfirm ? 'border-emerald-400' : 'border-red-400'
                    : 'border-gray-200 focus:border-emerald-400'
                }`}
                placeholder="••••"
              />
            </div>
            {pinConfirm.length === 4 && pin !== pinConfirm && (
              <p className="text-xs text-red-500 mt-1">Les codes PIN ne correspondent pas.</p>
            )}
          </div>

          <button
            type="button"
            onClick={onSubmitNew}
            disabled={submitting || !canSubmitNew}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner />Enregistrement...</>
              : <><RefreshCw className="w-4 h-4" />{submitLabel ?? (amount > 0 ? `Valider ${amount.toLocaleString('fr-FR')} €` : 'Valider mon prélèvement')}</>
            }
          </button>

          {hideSelection && (
            <button
              type="button"
              onClick={() => onSelectStatus('existing')}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              J&apos;ai déjà un compte donateur →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

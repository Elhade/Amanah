'use client';

import { useState } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import type { Leader } from '@/types';
import type { ProjectWithStats } from '@/types/project';
import { validateExistingDonor } from '@/actions/donation.actions';

import { AmountSelector, type DonationType } from './donation/AmountSelector';
import { AccountCheckStep, type AccountStatus } from './donation/AccountCheckStep';
import { StripePaymentStep } from './donation/StripePaymentStep';
import { SepaSetupStep } from './donation/SepaSetupStep';
import { SuccessScreen } from './donation/SuccessScreen';
import { VirementConfirmScreen } from './donation/VirementConfirmScreen';
import { Spinner } from './donation/shared';

type Step = 'form' | 'stripe' | 'sepa-setup' | 'virement' | 'success';

interface Props {
  project: ProjectWithStats;
  leader?: Leader | null;
}

export function DonationForm({ project, leader = null }: Props) {
  const [step, setStep] = useState<Step>('form');

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const [donationType, setDonationType] = useState<DonationType>('ponctuel');

  // Récurrent — nouveau compte (pseudo + PIN uniquement)
  const [recurrentPseudo, setRecurrentPseudo] = useState('');
  const [recurrentPin, setRecurrentPin] = useState('');

  // Récurrent — compte existant
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('undecided');
  const [existingIdentifier, setExistingIdentifier] = useState('');
  const [existingPin, setExistingPin] = useState('');
  const [foundDonorName, setFoundDonorName] = useState('');
  const [foundDonorEmail, setFoundDonorEmail] = useState('');

  // SEPA
  const [donorId, setDonorId] = useState('');
  const [sepaClientSecret, setSepaClientSecret] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const finalAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0);

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validateAmount = () => {
    if (!finalAmount || finalAmount < 0.5) {
      setError('Le montant minimum est de 0,50 €.');
      return false;
    }
    return true;
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const initiateSepaPayment = async (id: string, pmId: string): Promise<void> => {
    const res = await fetch('/api/create-sepa-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donor_id: id,
        montant: finalAmount,
        leader_id: leader?.id ?? null,
        project_id: project.id,
        payment_method_id: pmId,
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
  };

  // ─── Ponctuel — carte ────────────────────────────────────────────────────────

  const handleProceedToCard = async () => {
    setError('');
    if (!validateAmount()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(finalAmount * 100),
          currency: 'eur',
          metadata: {
            leader_id: leader?.id ?? '',
            project_id: project.id,
          },
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setClientSecret(json.clientSecret);
      setStep('stripe');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Récurrent — compte existant ─────────────────────────────────────────────

  const handleValidateExisting = async () => {
    setError('');
    if (!validateAmount()) return;
    setSubmitting(true);
    try {
      const result = await validateExistingDonor({ identifier: existingIdentifier, pin: existingPin });
      if (!result.ok) { setError(result.error); return; }

      const donor = result.data;
      setDonorId(donor.id);
      setFoundDonorName(donor.nom);
      setFoundDonorEmail(donor.email ?? '');

      if (donor.stripe_payment_method_id) {
        await initiateSepaPayment(donor.id, donor.stripe_payment_method_id);
        setStep('virement');
      } else {
        const res = await fetch('/api/create-setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ donor_id: donor.id, email: donor.email ?? '', nom: donor.nom }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setSepaClientSecret(json.clientSecret);
        setStep('sepa-setup');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Récurrent — nouveau compte ──────────────────────────────────────────────

  const handleNewDonorSubmit = () => {
    setError('');
    if (!validateAmount()) return;
    if (!recurrentPseudo.trim()) { setError('Le pseudo est obligatoire.'); return; }
    if (recurrentPin.length !== 4) { setError('Le code PIN doit contenir 4 chiffres.'); return; }
    setStep('sepa-setup');
  };

  // ─── Après configuration SEPA ────────────────────────────────────────────────

  const handleSepaSetupComplete = async (
    paymentMethodId: string,
    newDonorId?: string,
    newDonorName?: string
  ) => {
    const id = newDonorId || donorId;
    if (newDonorId) setDonorId(newDonorId);
    if (newDonorName) setFoundDonorName(newDonorName);
    setError('');
    setSubmitting(true);
    try {
      await initiateSepaPayment(id, paymentMethodId);
      setStep('virement');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du prélèvement.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <SuccessScreen
        amount={finalAmount}
        project={project}
        leader={leader}
        isCard={true}
      />
    );
  }

  if (step === 'virement') {
    return (
      <VirementConfirmScreen
        amount={finalAmount}
        project={project}
        leader={leader}
        pseudo={foundDonorName}
        isExistingAccount={!!foundDonorName && !recurrentPseudo}
      />
    );
  }

  if (step === 'sepa-setup') {
    const isNewAccount = !!recurrentPseudo;
    return (
      <div className="p-6">
        {isNewAccount ? (
          <SepaSetupStep
            pendingPseudo={recurrentPseudo}
            pendingPin={recurrentPin}
            amount={finalAmount}
            onSuccess={(pmId: string, newDonorId?: string, newDonorName?: string) =>
              void handleSepaSetupComplete(pmId, newDonorId, newDonorName)
            }
          />
        ) : (
          <SepaSetupStep
            donorId={donorId}
            clientSecret={sepaClientSecret}
            donorName={foundDonorName}
            donorEmail={foundDonorEmail}
            amount={finalAmount}
            onSuccess={(pmId: string) => void handleSepaSetupComplete(pmId)}
          />
        )}
      </div>
    );
  }

  if (step === 'stripe') {
    return (
      <div className="p-6">
        <StripePaymentStep
          clientSecret={clientSecret}
          amount={finalAmount}
          onSuccess={() => setStep('success')}
        />
      </div>
    );
  }

  // step === 'form'
  return (
    <div className="p-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <AmountSelector
          selectedAmount={selectedAmount}
          customAmount={customAmount}
          donationType={donationType}
          onSelectAmount={amount => { setSelectedAmount(amount); setCustomAmount(''); }}
          onCustomAmount={val => { setCustomAmount(val); setSelectedAmount(null); }}
          onSetDonationType={type => {
            setDonationType(type);
            setAccountStatus('undecided');
            setExistingIdentifier('');
            setError('');
          }}
        />

        {donationType === 'recurrent' && (
          <AccountCheckStep
            accountStatus={accountStatus}
            onSelectStatus={status => { setAccountStatus(status); setError(''); }}
            existingIdentifier={existingIdentifier}
            existingPin={existingPin}
            onIdentifierChange={setExistingIdentifier}
            onExistingPinChange={setExistingPin}
            onValidateExisting={handleValidateExisting}
            pseudo={recurrentPseudo}
            pin={recurrentPin}
            onPseudoChange={setRecurrentPseudo}
            onPinChange={setRecurrentPin}
            onSubmitNew={handleNewDonorSubmit}
            submitting={submitting}
            amount={finalAmount}
          />
        )}

        {donationType === 'ponctuel' && (
          <button
            type="button"
            onClick={handleProceedToCard}
            disabled={submitting || (!selectedAmount && !customAmount)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:shadow-none text-base flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Spinner />Préparation...</>
              : <><Lock className="w-4 h-4" />{finalAmount > 0 ? `Payer ${finalAmount.toLocaleString('fr-FR')} € par carte` : 'Payer par carte'}</>
            }
          </button>
        )}

        <p className="text-center text-xs text-gray-400">
          Votre don contribue directement aux projets sélectionnés
        </p>
      </div>
    </div>
  );
}

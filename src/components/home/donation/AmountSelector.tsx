'use client';

import { CalendarDays, Gift, RefreshCw } from 'lucide-react';
import { PRESET_AMOUNTS, SectionHeader } from './shared';

export type DonationType = 'ponctuel' | 'recurrent';

interface Props {
  selectedAmount: number | null;
  customAmount: string;
  donationType: DonationType;
  onSelectAmount: (amount: number) => void;
  onCustomAmount: (val: string) => void;
  onSetDonationType: (type: DonationType) => void;
}

export function AmountSelector({
  selectedAmount, customAmount, donationType,
  onSelectAmount, onCustomAmount, onSetDonationType,
}: Props) {
  return (
    <>
      <div>
        <SectionHeader icon={<span className="text-sm font-bold">€</span>} label="Montant du don" />
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PRESET_AMOUNTS.map(amount => (
            <button
              key={amount}
              type="button"
              onClick={() => onSelectAmount(amount)}
              className={`py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.03] active:scale-[0.97] ${
                selectedAmount === amount
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {amount} €
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="number"
            value={customAmount}
            onChange={e => onCustomAmount(e.target.value)}
            min="1"
            step="0.01"
            className="w-full pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-base font-medium"
            placeholder="Autre montant..."
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
        </div>
      </div>

      <div>
        <SectionHeader icon={<CalendarDays className="w-4 h-4" />} label="Type de don" />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onSetDonationType('ponctuel')}
            className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
              donationType === 'ponctuel'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Gift className="w-4 h-4" />
            Ponctuel
          </button>
          <button
            type="button"
            onClick={() => onSetDonationType('recurrent')}
            className={`flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition-all ${
              donationType === 'recurrent'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Récurrent
          </button>
        </div>
      </div>
    </>
  );
}

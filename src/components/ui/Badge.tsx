import React from 'react';
import type { DonationStatus } from '../../types';

interface BadgeProps {
  status: DonationStatus;
}

const config: Record<DonationStatus, { label: string; className: string }> = {
  paid: { label: 'Payé', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  cash_validated: { label: 'Cash', className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  pending: { label: 'En attente', className: 'bg-red-100 text-red-600 border border-red-200' },
};

export function Badge({ status }: BadgeProps) {
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'paid' ? 'bg-emerald-500' : status === 'cash_validated' ? 'bg-amber-500' : 'bg-red-500'}`} />
      {label}
    </span>
  );
}

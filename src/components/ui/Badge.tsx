import type { DonationStatus, DonationMethod } from '@/types';

interface BadgeProps {
  status: DonationStatus;
  method?: DonationMethod;
}

const config: Record<DonationStatus, { label: string; className: string; dot: string }> = {
  paid:            { label: 'Payé',            className: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  processing:      { label: 'En cours',        className: 'bg-blue-100 text-blue-700 border border-blue-200',         dot: 'bg-blue-500'    },
  failed:          { label: 'Échoué',          className: 'bg-red-100 text-red-600 border border-red-200',            dot: 'bg-red-500'     },
  cash_received:   { label: 'Espèces reçues',  className: 'bg-amber-100 text-amber-700 border border-amber-200',      dot: 'bg-amber-400'   },
  cash_remitted:   { label: 'Espèces versées', className: 'bg-teal-100 text-teal-700 border border-teal-200',         dot: 'bg-teal-500'    },
};

function processingLabel(method?: DonationMethod): string {
  if (method === 'cash') return 'Versement en cours';
  if (method === 'prelevement_sepa') return 'Prélèvement en cours';
  return 'En cours';
}

export function Badge({ status, method }: BadgeProps) {
  const base = config[status] ?? { label: status, className: 'bg-gray-100 text-gray-500 border border-gray-200', dot: 'bg-gray-400' };
  const label = status === 'processing' ? processingLabel(method) : base.label;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${base.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${base.dot}`} />
      {label}
    </span>
  );
}

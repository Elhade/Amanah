import type { DonationMethod } from '@/types';

interface MethodBadgeProps {
  method: DonationMethod;
}

const config: Record<DonationMethod, { label: string; className: string }> = {
  card:             { label: 'Carte',            className: 'bg-blue-100 text-blue-600 border border-blue-200'         },
  prelevement_sepa: { label: 'Prélèvement SEPA', className: 'bg-violet-100 text-violet-700 border border-violet-200'   },
  cash:             { label: 'Espèces',           className: 'bg-amber-100 text-amber-700 border border-amber-200'     },
};

export function MethodBadge({ method }: MethodBadgeProps) {
  const { label, className } = config[method];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

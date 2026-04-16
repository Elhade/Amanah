import type { DonationMethod } from '@/lib/types';

interface MethodBadgeProps {
  method: DonationMethod;
}

const config: Record<DonationMethod, { label: string; className: string }> = {
  cash: { label: 'Cash', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  stripe: { label: 'Stripe', className: 'bg-blue-100 text-blue-600 border border-blue-200' },
  paypal: { label: 'PayPal', className: 'bg-sky-100 text-sky-600 border border-sky-200' },
};

export function MethodBadge({ method }: MethodBadgeProps) {
  const { label, className } = config[method];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

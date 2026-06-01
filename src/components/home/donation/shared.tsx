export const PRESET_AMOUNTS = [5, 10, 20, 50, 100, 200];

export function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
  );
}

export function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export interface StripeInstance {
  elements: (options: object) => StripeElements;
  confirmPayment: (options: object) => Promise<{ error?: { message: string } }>;
  confirmSetup: (options: object) => Promise<{
    setupIntent?: { payment_method: string | { id: string } | null };
    error?: { message: string };
  }>;
}

export interface StripeElements {
  create: (type: string, options?: object) => StripeElement;
  getElement: (type: string) => StripeElement | null;
  submit: () => Promise<{ error?: { message: string } }>;
}

export interface StripeElement {
  mount: (el: HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Stripe?: (key: string) => StripeInstance;
  }
}

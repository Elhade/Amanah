import type { StripeInstance } from '@/components/home/donation/shared';

export function loadStripeClient(): StripeInstance | null {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk || typeof window === 'undefined' || !window.Stripe) return null;
  return window.Stripe(pk);
}

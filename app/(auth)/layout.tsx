import { AppShell } from '@/components/AppShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

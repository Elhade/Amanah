'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, HandHeart, History, FolderOpen, Users,
  LogOut, Menu, X, Star, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/mon-espace', label: 'Mon espace', icon: Star },
  { href: '/ajouter-don', label: 'Gestions', icon: HandHeart },
  { href: '/historique', label: 'Historique', icon: History },
  { href: '/projets', label: 'Projets', icon: FolderOpen, adminOnly: true },
  { href: '/responsables', label: 'Responsables', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = profile?.role === 'super_admin';

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg">
            <HandHeart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">JamaaAmanah</h1>
            <p className="text-emerald-300 text-xs">La confiance au cœur des dons</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="bg-emerald-800/50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">
              {(profile?.nom || profile?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{profile?.nom || 'Utilisateur'}</p>
            <p className="text-emerald-300 text-xs">{isAdmin ? 'Super Admin' : 'Responsable'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => { router.push(item.href); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/25'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-emerald-300 group-hover:text-white'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {active && <ChevronRight className="w-4 h-4 text-white/70" />}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pb-8 mt-4">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-emerald-300 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-emerald-900 text-white p-2 rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-emerald-900 via-emerald-900 to-emerald-950 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-emerald-300 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-900 to-emerald-950 fixed left-0 top-0 bottom-0 z-30 shadow-2xl">
        <SidebarContent />
      </aside>
    </>
  );
}

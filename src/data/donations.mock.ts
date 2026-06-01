import type { Donor, Leader, Donation } from '@/types';

// ─── Donateurs ───────────────────────────────────────────────────────────────

export const mockDonors: Donor[] = [
  {
    id: 'mock-donor-1',
    nom: 'Mohammed Ouali',
    pseudo: 'mo_ouali',
    email: 'mo.ouali@email.com',
    telephone: '+33 6 11 22 33 44',
    stripe_customer_id: null,
    stripe_payment_method_id: null,
    created_at: '2026-02-03T10:00:00.000Z',
  },
  {
    id: 'mock-donor-2',
    nom: 'Fatima Benali',
    pseudo: null,
    email: 'fatima.benali@gmail.com',
    telephone: '+33 6 55 66 77 88',
    stripe_customer_id: null,
    stripe_payment_method_id: null,
    created_at: '2026-02-14T14:30:00.000Z',
  },
  {
    id: 'mock-donor-3',
    nom: 'Anonyme',
    pseudo: null,
    email: null,
    telephone: null,
    stripe_customer_id: null,
    stripe_payment_method_id: null,
    created_at: '2026-03-05T09:00:00.000Z',
  },
  {
    id: 'mock-donor-4',
    nom: 'Youssef Hamid',
    pseudo: 'y_hamid',
    email: 'youssef.h@outlook.com',
    telephone: '+33 7 12 34 56 78',
    stripe_customer_id: null,
    stripe_payment_method_id: null,
    created_at: '2026-03-12T11:00:00.000Z',
  },
  {
    id: 'mock-donor-5',
    nom: 'Aicha Mansouri',
    pseudo: null,
    email: 'aicha.mansouri@yahoo.fr',
    telephone: '+33 6 98 76 54 32',
    stripe_customer_id: null,
    stripe_payment_method_id: null,
    created_at: '2026-04-01T16:00:00.000Z',
  },
  {
    id: 'mock-donor-6',
    nom: 'Ibrahim Kone',
    pseudo: 'ibrahim_k',
    email: 'ibrahim.kone@email.com',
    telephone: '+33 6 44 55 66 77',
    stripe_customer_id: null,
    stripe_payment_method_id: null,
    created_at: '2026-04-20T08:30:00.000Z',
  },
];

// ─── Responsables ────────────────────────────────────────────────────────────

export const mockLeaders: Leader[] = [
  {
    id: 'mock-leader-1',
    user_id: null,
    nom_affichage: 'Imam Khalid',
    slug: 'khalid',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'mock-leader-2',
    user_id: null,
    nom_affichage: 'Frère Nassim',
    slug: 'nassim',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

// ─── Donations — cas concrets ────────────────────────────────────────────────
//
// Cas couverts :
//   #1  Carte Stripe payée (paid)
//   #2  SEPA récurrent en attente de premier virement (pending)
//   #3  Espèces en attente de validation (pending)
//   #4  Espèces validées par le responsable (cash_validated)
//   #5  Carte Stripe payée, don direct sans responsable
//   #6  SEPA récurrent, compte existant
//   #7  Espèces — grand montant validé
//   #8  Carte Stripe — don anonyme

export const mockDonations: Donation[] = [
  // #1 — Fatima, carte Stripe, 50 €, payé, via Khalid → Nourriture
  {
    id: 'mock-don-1',
    donor_id: 'mock-donor-2',
    leader_id: 'mock-leader-1',
    project_id: 'mock-project-1',
    montant: 50,
    methode: 'stripe',
    statut: 'paid',
    created_at: '2026-02-14T15:02:00.000Z',
    donors: { nom: 'Fatima Benali' },
    leaders: { nom_affichage: 'Imam Khalid', slug: 'khalid' },
    projects: { nom: 'Nourrir les Nécessiteux' },
  },

  // #2 — Mohammed, SEPA nouveau compte, 100 €/mois, en attente, via Khalid → Construction
  {
    id: 'mock-don-2',
    donor_id: 'mock-donor-1',
    leader_id: 'mock-leader-1',
    project_id: 'mock-project-2',
    montant: 100,
    methode: 'virement',
    statut: 'pending',
    created_at: '2026-02-20T09:15:00.000Z',
    donors: { nom: 'Mohammed Ouali' },
    leaders: { nom_affichage: 'Imam Khalid', slug: 'khalid' },
    projects: { nom: 'Sadaqa Jariya — Construction' },
  },

  // #3 — Anonyme, espèces, 20 €, en attente de validation, via Khalid → Nourriture
  {
    id: 'mock-don-3',
    donor_id: 'mock-donor-3',
    leader_id: 'mock-leader-1',
    project_id: 'mock-project-1',
    montant: 20,
    methode: 'cash',
    statut: 'pending',
    created_at: '2026-03-05T10:00:00.000Z',
    donors: { nom: 'Anonyme' },
    leaders: { nom_affichage: 'Imam Khalid', slug: 'khalid' },
    projects: { nom: 'Nourrir les Nécessiteux' },
  },

  // #4 — Aicha, espèces, 30 €, validée, via Nassim → Bourses
  {
    id: 'mock-don-4',
    donor_id: 'mock-donor-5',
    leader_id: 'mock-leader-2',
    project_id: 'mock-project-3',
    montant: 30,
    methode: 'cash',
    statut: 'cash_validated',
    created_at: '2026-04-02T11:30:00.000Z',
    donors: { nom: 'Aicha Mansouri' },
    leaders: { nom_affichage: 'Frère Nassim', slug: 'nassim' },
    projects: { nom: 'Bourses Étudiantes' },
  },

  // #5 — Fatima, carte Stripe, 150 €, payé, direct (sans responsable) → Bourses
  {
    id: 'mock-don-5',
    donor_id: 'mock-donor-2',
    leader_id: null,
    project_id: 'mock-project-3',
    montant: 150,
    methode: 'stripe',
    statut: 'paid',
    created_at: '2026-04-10T18:45:00.000Z',
    donors: { nom: 'Fatima Benali' },
    leaders: null,
    projects: { nom: 'Bourses Étudiantes' },
  },

  // #6 — Youssef, SEPA compte existant, 200 €, en attente, via Nassim → Construction
  {
    id: 'mock-don-6',
    donor_id: 'mock-donor-4',
    leader_id: 'mock-leader-2',
    project_id: 'mock-project-2',
    montant: 200,
    methode: 'virement',
    statut: 'pending',
    created_at: '2026-04-15T08:00:00.000Z',
    donors: { nom: 'Youssef Hamid' },
    leaders: { nom_affichage: 'Frère Nassim', slug: 'nassim' },
    projects: { nom: 'Sadaqa Jariya — Construction' },
  },

  // #7 — Ibrahim, espèces, 500 €, grand don validé, via Nassim → Construction
  {
    id: 'mock-don-7',
    donor_id: 'mock-donor-6',
    leader_id: 'mock-leader-2',
    project_id: 'mock-project-2',
    montant: 500,
    methode: 'cash',
    statut: 'cash_validated',
    created_at: '2026-05-01T14:00:00.000Z',
    donors: { nom: 'Ibrahim Kone' },
    leaders: { nom_affichage: 'Frère Nassim', slug: 'nassim' },
    projects: { nom: 'Sadaqa Jariya — Construction' },
  },

  // #8 — Anonyme, carte Stripe, 10 €, payé, via Khalid → Nourriture
  {
    id: 'mock-don-8',
    donor_id: 'mock-donor-3',
    leader_id: 'mock-leader-1',
    project_id: 'mock-project-1',
    montant: 10,
    methode: 'stripe',
    statut: 'paid',
    created_at: '2026-05-20T21:10:00.000Z',
    donors: { nom: 'Anonyme' },
    leaders: { nom_affichage: 'Imam Khalid', slug: 'khalid' },
    projects: { nom: 'Nourrir les Nécessiteux' },
  },
];

// ─── Totaux précalculés (cohérents avec mockProjectsWithStats) ───────────────
// Nourriture  : don-1(50) + don-3(20 pending) + don-8(10) = 60 € confirmés
// Construction: don-2(100 pending) + don-6(200 pending) + don-7(500 validé) = 500 € confirmés
// Bourses     : don-4(30 validé) + don-5(150) = 180 € confirmés

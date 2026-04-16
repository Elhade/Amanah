export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          nom: string;
          role: 'super_admin' | 'leader';
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          nom?: string;
          role?: 'super_admin' | 'leader';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          nom?: string;
          role?: 'super_admin' | 'leader';
          created_at?: string;
        };
      };
      leaders: {
        Row: {
          id: string;
          user_id: string | null;
          nom_affichage: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          nom_affichage: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          nom_affichage?: string;
          slug?: string;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          nom: string;
          description: string;
          objectif: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          description?: string;
          objectif?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          description?: string;
          objectif?: number;
          created_at?: string;
        };
      };
      donors: {
        Row: {
          id: string;
          nom: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          donor_id: string | null;
          leader_id: string | null;
          project_id: string | null;
          montant: number;
          methode: 'stripe' | 'paypal' | 'cash';
          statut: 'paid' | 'pending' | 'cash_validated';
          created_at: string;
        };
        Insert: {
          id?: string;
          donor_id?: string | null;
          leader_id?: string | null;
          project_id?: string | null;
          montant: number;
          methode?: 'stripe' | 'paypal' | 'cash';
          statut?: 'paid' | 'pending' | 'cash_validated';
          created_at?: string;
        };
        Update: {
          id?: string;
          donor_id?: string | null;
          leader_id?: string | null;
          project_id?: string | null;
          montant?: number;
          methode?: 'stripe' | 'paypal' | 'cash';
          statut?: 'paid' | 'pending' | 'cash_validated';
          created_at?: string;
        };
      };
    };
  };
}

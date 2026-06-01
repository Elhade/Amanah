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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      donors: {
        Row: {
          id: string;
          nom: string;
          pseudo: string | null;
          email: string | null;
          telephone: string | null;
          stripe_customer_id: string | null;
          stripe_payment_method_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          pseudo?: string | null;
          email?: string | null;
          telephone?: string | null;
          stripe_customer_id?: string | null;
          stripe_payment_method_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          pseudo?: string | null;
          email?: string | null;
          telephone?: string | null;
          stripe_customer_id?: string | null;
          stripe_payment_method_id?: string | null;
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
          methode: 'card' | 'prelevement_sepa';
          statut: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          donor_id?: string | null;
          leader_id?: string | null;
          project_id?: string | null;
          montant: number;
          methode?: 'card' | 'prelevement_sepa';
          statut?: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          donor_id?: string | null;
          leader_id?: string | null;
          project_id?: string | null;
          montant?: number;
          methode?: 'card' | 'prelevement_sepa';
          statut?: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: 'super_admin' | 'leader';
      donation_method: 'card' | 'prelevement_sepa';
      donation_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    };
    CompositeTypes: Record<string, never>;
  };
}

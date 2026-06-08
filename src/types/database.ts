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
          nom_equipe: string | null;
          slug: string;
          donor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          nom_affichage: string;
          nom_equipe?: string | null;
          slug: string;
          donor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          nom_affichage?: string;
          nom_equipe?: string | null;
          slug?: string;
          donor_id?: string | null;
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
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          description?: string;
          objectif?: number;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          description?: string;
          objectif?: number;
          image_url?: string | null;
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
          pin_hash: string | null;
          pin_salt: string | null;
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
          pin_hash?: string | null;
          pin_salt?: string | null;
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
          pin_hash?: string | null;
          pin_salt?: string | null;
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
          methode: 'card' | 'prelevement_sepa' | 'cash';
          statut: 'processing' | 'paid' | 'failed' | 'cash_received' | 'cash_remitted';
          stripe_payment_intent_id: string | null;
          remittance_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          donor_id?: string | null;
          leader_id?: string | null;
          project_id?: string | null;
          montant: number;
          methode?: 'card' | 'prelevement_sepa' | 'cash';
          statut?: 'processing' | 'paid' | 'failed' | 'cash_received' | 'cash_remitted';
          stripe_payment_intent_id?: string | null;
          remittance_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          donor_id?: string | null;
          leader_id?: string | null;
          project_id?: string | null;
          montant?: number;
          methode?: 'card' | 'prelevement_sepa' | 'cash';
          statut?: 'processing' | 'paid' | 'failed' | 'cash_received' | 'cash_remitted';
          stripe_payment_intent_id?: string | null;
          remittance_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      remittances: {
        Row: {
          id: string;
          leader_id: string;
          stripe_payment_intent_id: string | null;
          montant: number;
          statut: 'processing' | 'cash_remitted' | 'failed' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          leader_id: string;
          stripe_payment_intent_id?: string | null;
          montant: number;
          statut?: 'processing' | 'cash_remitted' | 'failed' | 'cancelled';
          created_at?: string;
        };
        Update: {
          id?: string;
          leader_id?: string;
          stripe_payment_intent_id?: string | null;
          montant?: number;
          statut?: 'processing' | 'cash_remitted' | 'failed' | 'cancelled';
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_casual_donor: {
        Args: { p_nom: string; p_email: string; p_telephone?: string | null };
        Returns: string;
      };
    };
    Enums: {
      user_role: 'super_admin' | 'leader';
      donation_method: 'card' | 'prelevement_sepa';
      donation_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cash_received' | 'cash_remitted';
    };
    CompositeTypes: Record<string, never>;
  };
}

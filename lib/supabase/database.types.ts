export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          plan: "free" | "pro" | "premium";
          credits_remaining: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          plan?: "free" | "pro" | "premium";
          credits_remaining?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          plan?: "free" | "pro" | "premium";
          credits_remaining?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      usage_logs: {
        Row: {
          id: number;
          user_id: string;
          query: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: string;
          query: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string;
          query?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: number;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

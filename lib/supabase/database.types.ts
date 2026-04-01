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
      analysis_interactions: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          normalized_topic: string;
          request_payload: Json;
          analysis_payload: Json | null;
          retrieval_payload: Json | null;
          status: string;
          source_count: number;
          error_message: string | null;
          approved: boolean | null;
          feedback_note: string | null;
          feedback_labels: string[];
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          normalized_topic: string;
          request_payload?: Json;
          analysis_payload?: Json | null;
          retrieval_payload?: Json | null;
          status?: string;
          source_count?: number;
          error_message?: string | null;
          approved?: boolean | null;
          feedback_note?: string | null;
          feedback_labels?: string[];
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          normalized_topic?: string;
          request_payload?: Json;
          analysis_payload?: Json | null;
          retrieval_payload?: Json | null;
          status?: string;
          source_count?: number;
          error_message?: string | null;
          approved?: boolean | null;
          feedback_note?: string | null;
          feedback_labels?: string[];
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_interactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      retrieval_memories: {
        Row: {
          id: number;
          user_id: string;
          interaction_id: string;
          topic: string;
          normalized_topic: string;
          memory_summary: string;
          confidence: number;
          memory_payload: Json;
          approved_at: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: string;
          interaction_id: string;
          topic: string;
          normalized_topic: string;
          memory_summary: string;
          confidence?: number;
          memory_payload?: Json;
          approved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: string;
          interaction_id?: string;
          topic?: string;
          normalized_topic?: string;
          memory_summary?: string;
          confidence?: number;
          memory_payload?: Json;
          approved_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "retrieval_memories_interaction_id_fkey";
            columns: ["interaction_id"];
            isOneToOne: true;
            referencedRelation: "analysis_interactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "retrieval_memories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
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

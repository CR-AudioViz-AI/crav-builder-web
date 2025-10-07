import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          owner_id: string;
        };
        Update: {
          name?: string;
        };
      };
      bases: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string;
          icon: string;
          color: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workspace_id: string;
          name: string;
          description?: string;
          icon?: string;
          color?: string;
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string;
          icon?: string;
          color?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          base_id: string;
          name: string;
          description: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          base_id: string;
          name: string;
          description?: string;
          order_index?: number;
        };
        Update: {
          name?: string;
          description?: string;
          order_index?: number;
        };
      };
      fields: {
        Row: {
          id: string;
          table_id: string;
          name: string;
          type: string;
          options: any;
          order_index: number;
          required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          table_id: string;
          name: string;
          type: string;
          options?: any;
          order_index?: number;
          required?: boolean;
        };
        Update: {
          name?: string;
          type?: string;
          options?: any;
          order_index?: number;
          required?: boolean;
        };
      };
      records: {
        Row: {
          id: string;
          table_id: string;
          data: any;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          table_id: string;
          data: any;
          created_by: string;
        };
        Update: {
          data?: any;
        };
      };
    };
  };
};

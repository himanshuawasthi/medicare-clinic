// Generated from migrations — regenerate after schema changes with:
// supabase gen types typescript --local > src/lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          full_name: string;
          mobile: string;
          gender: string;
          dob: string | null;
          address: string | null;
          allergies: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          mobile: string;
          gender: string;
          dob?: string | null;
          address?: string | null;
          allergies?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          mobile?: string;
          gender?: string;
          dob?: string | null;
          address?: string | null;
          allergies?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: string;
          full_name?: string | null;
        };
      };
      inventory_items: {
        Row: {
          id: string;
          name: string;
          unit: string;
          stock_qty: number;
          min_threshold: number;
          unit_price_paise: number;
          expiry_date: string | null;
          batch_number: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit: string;
          stock_qty?: number;
          min_threshold?: number;
          unit_price_paise: number;
          expiry_date?: string | null;
          batch_number?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          unit?: string;
          stock_qty?: number;
          min_threshold?: number;
          unit_price_paise?: number;
          expiry_date?: string | null;
          batch_number?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
      };
      prescriptions: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          status: string;
          symptoms: string;
          vitals: Json | null;
          doctor_notes: string | null;
          recommended_tests: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          status?: string;
          symptoms: string;
          vitals?: Json | null;
          doctor_notes?: string | null;
          recommended_tests?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          symptoms?: string;
          vitals?: Json | null;
          doctor_notes?: string | null;
          recommended_tests?: string[] | null;
          updated_at?: string;
        };
      };
      prescription_items: {
        Row: {
          id: string;
          prescription_id: string;
          medicine_name: string;
          dosage: string | null;
          frequency: string | null;
          duration_days: number | null;
          quantity: number | null;
          inventory_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          medicine_name: string;
          dosage?: string | null;
          frequency?: string | null;
          duration_days?: number | null;
          quantity?: number | null;
          inventory_id?: string | null;
          created_at?: string;
        };
        Update: {
          medicine_name?: string;
          dosage?: string | null;
          frequency?: string | null;
          duration_days?: number | null;
          quantity?: number | null;
          inventory_id?: string | null;
        };
      };
      dispenses: {
        Row: {
          id: string;
          prescription_id: string;
          pharmacist_id: string;
          notes: string | null;
          flagged_edit_after_dispense: boolean;
          dispensed_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          pharmacist_id: string;
          notes?: string | null;
          flagged_edit_after_dispense?: boolean;
          dispensed_at?: string;
        };
        Update: {
          notes?: string | null;
          flagged_edit_after_dispense?: boolean;
        };
      };
      bill_lines: {
        Row: {
          id: string;
          dispense_id: string;
          inventory_id: string | null;
          medicine_name: string;
          qty_dispensed: number;
          decision: string;
          unit_price_paise: number;
          line_total_paise: number;
          substitute_inventory_id: string | null;
        };
        Insert: {
          id?: string;
          dispense_id: string;
          inventory_id?: string | null;
          medicine_name: string;
          qty_dispensed: number;
          decision: string;
          unit_price_paise: number;
          substitute_inventory_id?: string | null;
        };
        Update: {
          qty_dispensed?: number;
          decision?: string;
          unit_price_paise?: number;
        };
      };
      inventory_adjustments: {
        Row: {
          id: string;
          inventory_id: string;
          adjusted_by: string;
          actor_role: string;
          delta_qty: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          inventory_id: string;
          adjusted_by: string;
          actor_role: string;
          delta_qty: number;
          reason: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: {
      inventory_for_doctor: {
        Row: {
          id: string;
          name: string;
          unit: string;
          stock_qty: number;
          min_threshold: number;
          expiry_date: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
  audit: {
    Tables: {
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          operation: string;
          target_id: string;
          actor_id: string | null;
          actor_role: string | null;
          before_json: Json | null;
          after_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          operation: string;
          target_id: string;
          actor_id?: string | null;
          actor_role?: string | null;
          before_json?: Json | null;
          after_json?: Json | null;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
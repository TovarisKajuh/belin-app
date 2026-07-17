export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acceptance_defects: {
        Row: {
          acceptance_id: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          photo_path: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          acceptance_id: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          photo_path?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          acceptance_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          photo_path?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acceptance_defects_acceptance_id_fkey"
            columns: ["acceptance_id"]
            isOneToOne: false
            referencedRelation: "acceptances"
            referencedColumns: ["id"]
          },
        ]
      }
      acceptances: {
        Row: {
          conducted_at: string | null
          created_at: string
          epc_signature_path: string | null
          epc_signer_name: string | null
          id: string
          kind: string
          note: string | null
          project_id: string
          report_pdf_path: string | null
          status: string
          sub_signature_path: string | null
          sub_signer_name: string | null
          updated_at: string
        }
        Insert: {
          conducted_at?: string | null
          created_at?: string
          epc_signature_path?: string | null
          epc_signer_name?: string | null
          id?: string
          kind?: string
          note?: string | null
          project_id: string
          report_pdf_path?: string | null
          status?: string
          sub_signature_path?: string | null
          sub_signer_name?: string | null
          updated_at?: string
        }
        Update: {
          conducted_at?: string | null
          created_at?: string
          epc_signature_path?: string | null
          epc_signer_name?: string | null
          id?: string
          kind?: string
          note?: string | null
          project_id?: string
          report_pdf_path?: string | null
          status?: string
          sub_signature_path?: string | null
          sub_signer_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acceptances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity: {
        Row: {
          actor_person: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          project_id: string
        }
        Insert: {
          actor_person?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          project_id: string
        }
        Update: {
          actor_person?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_actor_person_fkey"
            columns: ["actor_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_photos: {
        Row: {
          change_order_id: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_photos_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          created_at: string
          created_by_person: string | null
          decided_at: string | null
          decided_by_person: string | null
          description: string | null
          id: string
          number: number
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_person?: string | null
          decided_at?: string | null
          decided_by_person?: string | null
          description?: string | null
          id?: string
          number: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_person?: string | null
          decided_at?: string | null
          decided_by_person?: string | null
          description?: string | null
          id?: string
          number?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_created_by_person_fkey"
            columns: ["created_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_decided_by_person_fkey"
            columns: ["decided_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entries: {
        Row: {
          client_generated_id: string | null
          created_at: string
          created_by_person: string | null
          entry_date: string
          headcount: number | null
          id: string
          note: string | null
          project_id: string
          updated_at: string
          weather: Json | null
        }
        Insert: {
          client_generated_id?: string | null
          created_at?: string
          created_by_person?: string | null
          entry_date: string
          headcount?: number | null
          id?: string
          note?: string | null
          project_id: string
          updated_at?: string
          weather?: Json | null
        }
        Update: {
          client_generated_id?: string | null
          created_at?: string
          created_by_person?: string | null
          entry_date?: string
          headcount?: number | null
          id?: string
          note?: string | null
          project_id?: string
          updated_at?: string
          weather?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_created_by_person_fkey"
            columns: ["created_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reminders: {
        Row: {
          days_before: number
          document_id: string
          id: string
          sent_at: string
        }
        Insert: {
          days_before: number
          document_id: string
          id?: string
          sent_at?: string
        }
        Update: {
          days_before?: number
          document_id?: string
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reminders_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          org_id: string
          person_id: string | null
          storage_path: string
          title: string
          type: string
          updated_at: string
          uploaded_by_person: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          person_id?: string | null
          storage_path: string
          title: string
          type: string
          updated_at?: string
          uploaded_by_person?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          person_id?: string | null
          storage_path?: string
          title?: string
          type?: string
          updated_at?: string
          uploaded_by_person?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_person_fkey"
            columns: ["uploaded_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_photos: {
        Row: {
          created_at: string
          entry_id: string
          height: number | null
          id: string
          sort_order: number
          storage_path: string
          taken_at: string | null
          width: number | null
        }
        Insert: {
          created_at?: string
          entry_id: string
          height?: number | null
          id?: string
          sort_order?: number
          storage_path: string
          taken_at?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          height?: number | null
          id?: string
          sort_order?: number
          storage_path?: string
          taken_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_quantities: {
        Row: {
          entry_id: string
          id: string
          qty: number
          scope_item_id: string
        }
        Insert: {
          entry_id: string
          id?: string
          qty: number
          scope_item_id: string
        }
        Update: {
          entry_id?: string
          id?: string
          qty?: number
          scope_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_quantities_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "daily_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_quantities_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string
          id: string
          kind: string
          language: string
          project_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          language: string
          project_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          language?: string
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hour_sheet_lines: {
        Row: {
          created_at: string
          description: string
          hours: number
          id: string
          person_id: string | null
          sheet_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          description: string
          hours: number
          id?: string
          person_id?: string | null
          sheet_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          description?: string
          hours?: number
          id?: string
          person_id?: string | null
          sheet_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hour_sheet_lines_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hour_sheet_lines_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "hour_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      hour_sheets: {
        Row: {
          created_at: string
          created_by_person: string | null
          deadline_at: string | null
          decided_at: string | null
          decided_by_person: string | null
          epc_signature_path: string | null
          id: string
          note: string | null
          number: number
          project_id: string
          status: string
          sub_org_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_person?: string | null
          deadline_at?: string | null
          decided_at?: string | null
          decided_by_person?: string | null
          epc_signature_path?: string | null
          id?: string
          note?: string | null
          number: number
          project_id: string
          status?: string
          sub_org_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_person?: string | null
          deadline_at?: string | null
          decided_at?: string | null
          decided_by_person?: string | null
          epc_signature_path?: string | null
          id?: string
          note?: string | null
          number?: number
          project_id?: string
          status?: string
          sub_org_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hour_sheets_created_by_person_fkey"
            columns: ["created_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hour_sheets_decided_by_person_fkey"
            columns: ["decided_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hour_sheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hour_sheets_sub_org_id_fkey"
            columns: ["sub_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by_person: string | null
          email: string | null
          expires_at: string | null
          id: string
          invited_role: string | null
          kind: string
          org_id: string | null
          project_id: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by_person?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_role?: string | null
          kind: string
          org_id?: string | null
          project_id?: string | null
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          created_by_person?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_role?: string | null
          kind?: string
          org_id?: string | null
          project_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_person_fkey"
            columns: ["created_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_check_items: {
        Row: {
          check_id: string
          id: string
          material_item_id: string
          missing_qty: number | null
          status: string
        }
        Insert: {
          check_id: string
          id?: string
          material_item_id: string
          missing_qty?: number | null
          status: string
        }
        Update: {
          check_id?: string
          id?: string
          material_item_id?: string
          missing_qty?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_check_items_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "material_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_check_items_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "material_items"
            referencedColumns: ["id"]
          },
        ]
      }
      material_checks: {
        Row: {
          checked_at: string
          checked_by_person: string | null
          id: string
          is_complete: boolean
          note: string | null
          project_id: string
        }
        Insert: {
          checked_at?: string
          checked_by_person?: string | null
          id?: string
          is_complete: boolean
          note?: string | null
          project_id: string
        }
        Update: {
          checked_at?: string
          checked_by_person?: string | null
          id?: string
          is_complete?: boolean
          note?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_checks_checked_by_person_fkey"
            columns: ["checked_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_items: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          qty: number
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          qty: number
          sort_order?: number
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          qty?: number
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          org_id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          org_id: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tokens: {
        Row: {
          created_at: string
          id: string
          label: string | null
          last_used_at: string | null
          project_id: string
          revoked: boolean
          role: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          project_id: string
          revoked?: boolean
          role: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          project_id?: string
          revoked?: boolean
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          country: string
          created_at: string
          epc_org_id: string
          hourly_work_approved: boolean
          id: string
          kwp: number | null
          language: string
          lat: number | null
          lng: number | null
          module_count: number | null
          module_type: string | null
          mounting_system: string | null
          name: string
          plan_pdf_path: string | null
          roof_type: string | null
          status: string
          sub_org_id: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          country: string
          created_at?: string
          epc_org_id: string
          hourly_work_approved?: boolean
          id?: string
          kwp?: number | null
          language?: string
          lat?: number | null
          lng?: number | null
          module_count?: number | null
          module_type?: string | null
          mounting_system?: string | null
          name: string
          plan_pdf_path?: string | null
          roof_type?: string | null
          status?: string
          sub_org_id?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          country?: string
          created_at?: string
          epc_org_id?: string
          hourly_work_approved?: boolean
          id?: string
          kwp?: number | null
          language?: string
          lat?: number | null
          lng?: number | null
          module_count?: number | null
          module_type?: string | null
          mounting_system?: string | null
          name?: string
          plan_pdf_path?: string | null
          roof_type?: string | null
          status?: string
          sub_org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_epc_org_id_fkey"
            columns: ["epc_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_sub_org_id_fkey"
            columns: ["sub_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string
          created_by_person: string | null
          id: string
          photo_path: string | null
          project_id: string
          resolved_at: string | null
          response_note: string | null
          status: string
          text: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_person?: string | null
          id?: string
          photo_path?: string | null
          project_id: string
          resolved_at?: string | null
          response_note?: string | null
          status?: string
          text: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_person?: string | null
          id?: string
          photo_path?: string | null
          project_id?: string
          resolved_at?: string | null
          response_note?: string | null
          status?: string
          text?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_created_by_person_fkey"
            columns: ["created_by_person"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_items: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          target_qty: number
          unit: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
          target_qty: number
          unit: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          target_qty?: number
          unit?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      scope_installed: {
        Args: { p_project: string }
        Returns: { scope_item_id: string; installed: number }[]
      }
      submit_daily_report: {
        Args: {
          p_project: string
          p_entry_date: string
          p_note: string | null
          p_headcount: number | null
          p_weather: Json | null
          p_client_id: string
          p_quantities: Json
          p_photo_paths: string[] | null
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

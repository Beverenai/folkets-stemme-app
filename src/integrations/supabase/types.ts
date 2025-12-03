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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      folke_stemmer: {
        Row: {
          created_at: string
          id: string
          sak_id: string
          stemme: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sak_id: string
          stemme: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sak_id?: string
          stemme?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folke_stemmer_sak_id_fkey"
            columns: ["sak_id"]
            isOneToOne: false
            referencedRelation: "stortinget_saker"
            referencedColumns: ["id"]
          },
        ]
      }
      parti_voteringer: {
        Row: {
          created_at: string
          id: string
          parti_forkortelse: string
          parti_navn: string
          sak_id: string
          stemmer_avholdende: number
          stemmer_for: number
          stemmer_mot: number
        }
        Insert: {
          created_at?: string
          id?: string
          parti_forkortelse: string
          parti_navn: string
          sak_id: string
          stemmer_avholdende?: number
          stemmer_for?: number
          stemmer_mot?: number
        }
        Update: {
          created_at?: string
          id?: string
          parti_forkortelse?: string
          parti_navn?: string
          sak_id?: string
          stemmer_avholdende?: number
          stemmer_for?: number
          stemmer_mot?: number
        }
        Relationships: [
          {
            foreignKeyName: "parti_voteringer_sak_id_fkey"
            columns: ["sak_id"]
            isOneToOne: false
            referencedRelation: "stortinget_saker"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymous_id: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      representant_voteringer: {
        Row: {
          created_at: string
          id: string
          representant_id: string
          sak_id: string | null
          stemme: string
          votering_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          representant_id: string
          sak_id?: string | null
          stemme: string
          votering_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          representant_id?: string
          sak_id?: string | null
          stemme?: string
          votering_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representant_voteringer_representant_id_fkey"
            columns: ["representant_id"]
            isOneToOne: false
            referencedRelation: "representanter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representant_voteringer_sak_id_fkey"
            columns: ["sak_id"]
            isOneToOne: false
            referencedRelation: "stortinget_saker"
            referencedColumns: ["id"]
          },
        ]
      }
      representanter: {
        Row: {
          bilde_url: string | null
          created_at: string
          epost: string | null
          er_aktiv: boolean | null
          etternavn: string
          fodt: string | null
          fornavn: string
          fylke: string | null
          id: string
          kjonn: string | null
          komite: string | null
          parti: string | null
          parti_forkortelse: string | null
          stortinget_id: string
          updated_at: string
        }
        Insert: {
          bilde_url?: string | null
          created_at?: string
          epost?: string | null
          er_aktiv?: boolean | null
          etternavn: string
          fodt?: string | null
          fornavn: string
          fylke?: string | null
          id?: string
          kjonn?: string | null
          komite?: string | null
          parti?: string | null
          parti_forkortelse?: string | null
          stortinget_id: string
          updated_at?: string
        }
        Update: {
          bilde_url?: string | null
          created_at?: string
          epost?: string | null
          er_aktiv?: boolean | null
          etternavn?: string
          fodt?: string | null
          fornavn?: string
          fylke?: string | null
          id?: string
          kjonn?: string | null
          komite?: string | null
          parti?: string | null
          parti_forkortelse?: string | null
          stortinget_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stortinget_saker: {
        Row: {
          argumenter_for: Json | null
          argumenter_mot: Json | null
          behandlet_sesjon: string | null
          beskrivelse: string | null
          bilde_url: string | null
          created_at: string
          dokumentgruppe: string | null
          id: string
          kategori: string | null
          kort_tittel: string | null
          oppsummering: string | null
          sist_oppdatert_fra_stortinget: string | null
          status: string
          stengt_dato: string | null
          stortinget_id: string
          stortinget_vedtak: string | null
          stortinget_votering_avholdende: number | null
          stortinget_votering_for: number | null
          stortinget_votering_mot: number | null
          tema: string | null
          tittel: string
          updated_at: string
          vedtak_resultat: string | null
          voteringer_synced_at: string | null
        }
        Insert: {
          argumenter_for?: Json | null
          argumenter_mot?: Json | null
          behandlet_sesjon?: string | null
          beskrivelse?: string | null
          bilde_url?: string | null
          created_at?: string
          dokumentgruppe?: string | null
          id?: string
          kategori?: string | null
          kort_tittel?: string | null
          oppsummering?: string | null
          sist_oppdatert_fra_stortinget?: string | null
          status?: string
          stengt_dato?: string | null
          stortinget_id: string
          stortinget_vedtak?: string | null
          stortinget_votering_avholdende?: number | null
          stortinget_votering_for?: number | null
          stortinget_votering_mot?: number | null
          tema?: string | null
          tittel: string
          updated_at?: string
          vedtak_resultat?: string | null
          voteringer_synced_at?: string | null
        }
        Update: {
          argumenter_for?: Json | null
          argumenter_mot?: Json | null
          behandlet_sesjon?: string | null
          beskrivelse?: string | null
          bilde_url?: string | null
          created_at?: string
          dokumentgruppe?: string | null
          id?: string
          kategori?: string | null
          kort_tittel?: string | null
          oppsummering?: string | null
          sist_oppdatert_fra_stortinget?: string | null
          status?: string
          stengt_dato?: string | null
          stortinget_id?: string
          stortinget_vedtak?: string | null
          stortinget_votering_avholdende?: number | null
          stortinget_votering_for?: number | null
          stortinget_votering_mot?: number | null
          tema?: string | null
          tittel?: string
          updated_at?: string
          vedtak_resultat?: string | null
          voteringer_synced_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

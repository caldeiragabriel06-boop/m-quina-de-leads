export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      campaign_leads: {
        Row: {
          campaign_id: string;
          created_at: string;
          is_new: boolean;
          lead_id: string;
          owner_id: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          is_new: boolean;
          lead_id: string;
          owner_id?: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          is_new?: boolean;
          lead_id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'campaign_leads_campaign_id_owner_id_fkey';
            columns: ['campaign_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id', 'owner_id'];
          },
          {
            foreignKeyName: 'campaign_leads_lead_id_owner_id_fkey';
            columns: ['lead_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      campaigns: {
        Row: {
          created_at: string;
          filters: Json;
          id: string;
          intent: Json | null;
          name: string;
          owner_id: string;
          prompt: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          filters: Json;
          id?: string;
          intent?: Json | null;
          name: string;
          owner_id?: string;
          prompt: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          filters?: Json;
          id?: string;
          intent?: Json | null;
          name?: string;
          owner_id?: string;
          prompt?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          name: string;
        };
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      lead_activities: {
        Row: {
          body: string;
          channel: string | null;
          contacted_at: string | null;
          created_at: string;
          follow_up_at: string | null;
          id: string;
          kind: string;
          lead_id: string;
          owner_id: string;
        };
        Insert: {
          body: string;
          channel?: string | null;
          contacted_at?: string | null;
          created_at?: string;
          follow_up_at?: string | null;
          id?: string;
          kind: string;
          lead_id: string;
          owner_id?: string;
        };
        Update: {
          body?: string;
          channel?: string | null;
          contacted_at?: string | null;
          created_at?: string;
          follow_up_at?: string | null;
          id?: string;
          kind?: string;
          lead_id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_activities_lead_id_owner_id_fkey';
            columns: ['lead_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      lead_categories: {
        Row: {
          category: string;
          created_at: string;
          lead_id: string;
          owner_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          lead_id: string;
          owner_id?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          lead_id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_categories_category_fkey';
            columns: ['category'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'lead_categories_lead_id_owner_id_fkey';
            columns: ['lead_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      lead_identifiers: {
        Row: {
          created_at: string;
          identifier: string;
          lead_id: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          identifier: string;
          lead_id: string;
          owner_id?: string;
        };
        Update: {
          created_at?: string;
          identifier?: string;
          lead_id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_identifiers_lead_id_owner_id_fkey';
            columns: ['lead_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      lead_sources: {
        Row: {
          campaign_id: string;
          created_at: string;
          evidence: Json;
          id: string;
          lead_id: string;
          owner_id: string;
          url: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          evidence: Json;
          id?: string;
          lead_id: string;
          owner_id?: string;
          url: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          evidence?: Json;
          id?: string;
          lead_id?: string;
          owner_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_sources_campaign_id_owner_id_fkey';
            columns: ['campaign_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id', 'owner_id'];
          },
          {
            foreignKeyName: 'lead_sources_lead_id_owner_id_fkey';
            columns: ['lead_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'leads';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
      leads: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          description: string | null;
          email: string | null;
          facebook: string | null;
          follow_up_at: string | null;
          id: string;
          instagram: string | null;
          last_contact_at: string | null;
          linkedin: string | null;
          name: string;
          opportunities: Json;
          owner_id: string;
          phone: string | null;
          region: string | null;
          score: number;
          score_reasons: Json;
          segment: string | null;
          status: string;
          updated_at: string;
          website: string | null;
          website_state: string;
          whatsapp: string | null;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          facebook?: string | null;
          follow_up_at?: string | null;
          id?: string;
          instagram?: string | null;
          last_contact_at?: string | null;
          linkedin?: string | null;
          name: string;
          opportunities?: Json;
          owner_id?: string;
          phone?: string | null;
          region?: string | null;
          score?: number;
          score_reasons?: Json;
          segment?: string | null;
          status?: string;
          updated_at?: string;
          website?: string | null;
          website_state?: string;
          whatsapp?: string | null;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          facebook?: string | null;
          follow_up_at?: string | null;
          id?: string;
          instagram?: string | null;
          last_contact_at?: string | null;
          linkedin?: string | null;
          name?: string;
          opportunities?: Json;
          owner_id?: string;
          phone?: string | null;
          region?: string | null;
          score?: number;
          score_reasons?: Json;
          segment?: string | null;
          status?: string;
          updated_at?: string;
          website?: string | null;
          website_state?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      search_jobs: {
        Row: {
          campaign_id: string;
          created_at: string;
          cursor: number;
          duplicate_count: number;
          error: string | null;
          found: number;
          id: string;
          lease_token: string | null;
          lease_until: string | null;
          new_count: number;
          owner_id: string;
          stage: string;
          state: string;
          updated_at: string;
          urls: Json;
          valid: number;
          warnings: Json;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          cursor?: number;
          duplicate_count?: number;
          error?: string | null;
          found?: number;
          id?: string;
          lease_token?: string | null;
          lease_until?: string | null;
          new_count?: number;
          owner_id?: string;
          stage?: string;
          state?: string;
          updated_at?: string;
          urls?: Json;
          valid?: number;
          warnings?: Json;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          cursor?: number;
          duplicate_count?: number;
          error?: string | null;
          found?: number;
          id?: string;
          lease_token?: string | null;
          lease_until?: string | null;
          new_count?: number;
          owner_id?: string;
          stage?: string;
          state?: string;
          updated_at?: string;
          urls?: Json;
          valid?: number;
          warnings?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'search_jobs_campaign_id_owner_id_fkey';
            columns: ['campaign_id', 'owner_id'];
            isOneToOne: false;
            referencedRelation: 'campaigns';
            referencedColumns: ['id', 'owner_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      campaign_conversion: {
        Args: never;
        Returns: {
          campaign_id: string;
          status: string;
          total: number;
        }[];
      };
      claim_job: {
        Args: { p_id: string; p_token: string };
        Returns: {
          campaign_id: string;
          created_at: string;
          cursor: number;
          duplicate_count: number;
          error: string | null;
          found: number;
          id: string;
          lease_token: string | null;
          lease_until: string | null;
          new_count: number;
          owner_id: string;
          stage: string;
          state: string;
          updated_at: string;
          urls: Json;
          valid: number;
          warnings: Json;
        }[];
        SetofOptions: {
          from: '*';
          to: 'search_jobs';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_search: {
        Args: { p_filters: Json; p_name: string; p_prompt: string };
        Returns: string;
      };
      dashboard_stats: { Args: never; Returns: Json };
      ingest_page: {
        Args: {
          p_items: Json;
          p_job: string;
          p_token: string;
          p_warning?: string;
        };
        Returns: undefined;
      };
      record_activity: {
        Args: {
          p_body: string;
          p_channel?: string;
          p_contacted?: string;
          p_follow_up?: string;
          p_kind: string;
          p_lead: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

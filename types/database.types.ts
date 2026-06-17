export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "reviewer" | "viewer";
export type IdentityStatus = "active" | "disabled";
export type RiskSeverity = "medium" | "high" | "critical";
export type RiskStatus = "open" | "resolved";
export type CampaignType = "application" | "role" | "group";
export type CampaignStatus = "draft" | "in_progress" | "completed" | "archived";
export type ReviewDecision = "pending" | "approved" | "revoked" | "escalated";
export type EntitlementType = "role" | "group" | "application";
export type ReviewFrequency = "monthly" | "quarterly" | "semi_annual" | "annual";
export type CriticalityLevel = "low" | "medium" | "high" | "critical";

type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      identities: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          department: string;
          job_title: string;
          manager_id: string | null;
          employee_id: string;
          status: IdentityStatus;
          last_login: string | null;
          risk_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          department?: string;
          job_title?: string;
          manager_id?: string | null;
          employee_id: string;
          status?: IdentityStatus;
          last_login?: string | null;
          risk_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          department?: string;
          job_title?: string;
          manager_id?: string | null;
          employee_id?: string;
          status?: IdentityStatus;
          last_login?: string | null;
          risk_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_administrative: boolean;
          owner_id: string | null;
          review_frequency: ReviewFrequency | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_administrative?: boolean;
          owner_id?: string | null;
          review_frequency?: ReviewFrequency | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_administrative?: boolean;
          owner_id?: string | null;
          review_frequency?: ReviewFrequency | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      applications: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string | null;
          criticality_level: CriticalityLevel | null;
          review_frequency: ReviewFrequency | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id?: string | null;
          criticality_level?: CriticalityLevel | null;
          review_frequency?: ReviewFrequency | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string | null;
          criticality_level?: CriticalityLevel | null;
          review_frequency?: ReviewFrequency | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      identity_roles: {
        Row: {
          identity_id: string;
          role_id: string;
          assigned_at: string;
        };
        Insert: {
          identity_id: string;
          role_id: string;
          assigned_at?: string;
        };
        Update: {
          identity_id?: string;
          role_id?: string;
          assigned_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      identity_groups: {
        Row: {
          identity_id: string;
          group_id: string;
          assigned_at: string;
        };
        Insert: {
          identity_id: string;
          group_id: string;
          assigned_at?: string;
        };
        Update: {
          identity_id?: string;
          group_id?: string;
          assigned_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      identity_applications: {
        Row: {
          identity_id: string;
          application_id: string;
          assigned_at: string;
        };
        Insert: {
          identity_id: string;
          application_id: string;
          assigned_at?: string;
        };
        Update: {
          identity_id?: string;
          application_id?: string;
          assigned_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      sod_rules: {
        Row: {
          id: string;
          role_a_id: string;
          role_b_id: string;
          risk_level: RiskSeverity;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role_a_id: string;
          role_b_id: string;
          risk_level?: RiskSeverity;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role_a_id?: string;
          role_b_id?: string;
          risk_level?: RiskSeverity;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      risk_findings: {
        Row: {
          id: string;
          identity_id: string;
          rule_type: string;
          severity: RiskSeverity;
          status: RiskStatus;
          details: Json;
          risk_points: number;
          recommendation: string;
          detected_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          identity_id: string;
          rule_type: string;
          severity: RiskSeverity;
          status?: RiskStatus;
          details?: Json;
          risk_points?: number;
          recommendation?: string;
          detected_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          identity_id?: string;
          rule_type?: string;
          severity?: RiskSeverity;
          status?: RiskStatus;
          details?: Json;
          risk_points?: number;
          recommendation?: string;
          detected_at?: string;
          resolved_at?: string | null;
        };
        Relationships: GenericRelationship[];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          type: CampaignType;
          status: CampaignStatus;
          reviewer_id: string;
          entitlement_id: string;
          department_filter: string | null;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: CampaignType;
          status?: CampaignStatus;
          reviewer_id: string;
          entitlement_id: string;
          department_filter?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: CampaignType;
          status?: CampaignStatus;
          reviewer_id?: string;
          entitlement_id?: string;
          department_filter?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      campaign_items: {
        Row: {
          id: string;
          campaign_id: string;
          identity_id: string;
          entitlement_type: EntitlementType;
          entitlement_id: string;
          entitlement_name: string;
          decision: ReviewDecision;
          notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          identity_id: string;
          entitlement_type: EntitlementType;
          entitlement_id: string;
          entitlement_name: string;
          decision?: ReviewDecision;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          identity_id?: string;
          entitlement_type?: EntitlementType;
          entitlement_id?: string;
          entitlement_name?: string;
          decision?: ReviewDecision;
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      audit_logs: {
        Row: {
          id: string;
          event_type: string;
          entity_type: string;
          entity_id: string | null;
          actor_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          entity_type: string;
          entity_id?: string | null;
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          actor_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
      governance_metric_snapshots: {
        Row: {
          id: string;
          snapshot_date: string;
          total_users: number;
          high_risk_users: number;
          critical_findings: number;
          sod_violations: number;
          dormant_accounts: number;
          open_reviews: number;
          review_completion_percent: number;
          average_risk_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_date: string;
          total_users?: number;
          high_risk_users?: number;
          critical_findings?: number;
          sod_violations?: number;
          dormant_accounts?: number;
          open_reviews?: number;
          review_completion_percent?: number;
          average_risk_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          snapshot_date?: string;
          total_users?: number;
          high_risk_users?: number;
          critical_findings?: number;
          sod_violations?: number;
          dormant_accounts?: number;
          open_reviews?: number;
          review_completion_percent?: number;
          average_risk_score?: number;
          created_at?: string;
        };
        Relationships: GenericRelationship[];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      write_audit_log: {
        Args: { p_event_type: string; p_entity_type: string; p_entity_id: string | null; p_payload?: Json };
        Returns: string;
      };
    };
    CompositeTypes: { [_ in never]: never };
    Enums: {
      app_role: AppRole;
      identity_status: IdentityStatus;
      risk_severity: RiskSeverity;
      risk_status: RiskStatus;
      campaign_type: CampaignType;
      campaign_status: CampaignStatus;
      review_decision: ReviewDecision;
      entitlement_type: EntitlementType;
      review_frequency: ReviewFrequency;
      criticality_level: CriticalityLevel;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Identity = Tables<"identities">;
export type Role = Tables<"roles">;
export type Group = Tables<"groups">;
export type Application = Tables<"applications">;
export type Profile = Tables<"profiles">;
export type SodRule = Tables<"sod_rules">;
export type RiskFinding = Tables<"risk_findings">;
export type Campaign = Tables<"campaigns">;
export type CampaignItem = Tables<"campaign_items">;
export type AuditLog = Tables<"audit_logs">;
export type GovernanceMetricSnapshot = Tables<"governance_metric_snapshots">;

export type IdentityWithManager = Identity & {
  manager?: Pick<Identity, "id" | "first_name" | "last_name" | "email"> | null;
};

export type IdentityEntitlements = {
  roles: (Role & { assigned_at: string })[];
  groups: (Group & { assigned_at: string })[];
  applications: (Application & { assigned_at: string })[];
};

export type SodRuleWithRoles = SodRule & {
  role_a: Pick<Role, "id" | "name">;
  role_b: Pick<Role, "id" | "name">;
};

export type RiskFindingWithIdentity = RiskFinding & {
  identity: Pick<
    Identity,
    "id" | "first_name" | "last_name" | "email" | "department" | "risk_score"
  >;
};

export type CampaignWithReviewer = Campaign & {
  reviewer: Pick<Profile, "id" | "email" | "display_name">;
};

export type CampaignItemWithIdentity = CampaignItem & {
  identity: Pick<Identity, "id" | "first_name" | "last_name" | "email" | "department">;
};

export type IdentityOwner = Pick<
  Identity,
  "id" | "first_name" | "last_name" | "email" | "department"
>;

export type RoleWithOwnership = Role & {
  owner: IdentityOwner | null;
  assigned_user_count: number;
  review_status: string;
};

export type ApplicationWithOwnership = Application & {
  owner: IdentityOwner | null;
  assigned_user_count: number;
  review_status: string;
};

export type AssignedUserWithRisk = Pick<
  Identity,
  "id" | "first_name" | "last_name" | "email" | "department" | "risk_score"
> & {
  assigned_at: string;
};

export type OwnershipCampaignSummary = {
  id: string;
  name: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

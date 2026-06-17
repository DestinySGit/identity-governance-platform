-- Foundation: helpers, profiles, auth trigger

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.app_role AS ENUM ('admin', 'reviewer', 'viewer');
CREATE TYPE public.identity_status AS ENUM ('active', 'disabled');
CREATE TYPE public.risk_severity AS ENUM ('medium', 'high', 'critical');
CREATE TYPE public.risk_status AS ENUM ('open', 'resolved');
CREATE TYPE public.campaign_type AS ENUM ('application', 'role', 'group');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
CREATE TYPE public.review_decision AS ENUM ('pending', 'approved', 'revoked', 'escalated');
CREATE TYPE public.entitlement_type AS ENUM ('role', 'group', 'application');

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles (app login users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- First user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role public.app_role;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS helpers
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_reviewer_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'reviewer')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Identities (governed users)
CREATE TABLE public.identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  manager_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL UNIQUE,
  status public.identity_status NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER identities_updated_at
  BEFORE UPDATE ON public.identities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_identities_email ON public.identities(email);
CREATE INDEX idx_identities_department ON public.identities(department);
CREATE INDEX idx_identities_status ON public.identities(status);
CREATE INDEX idx_identities_last_login ON public.identities(last_login);
CREATE INDEX idx_identities_manager ON public.identities(manager_id);

-- Entitlement catalog
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_administrative BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Junction tables
CREATE TABLE public.identity_roles (
  identity_id UUID NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identity_id, role_id)
);

CREATE TABLE public.identity_groups (
  identity_id UUID NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identity_id, group_id)
);

CREATE TABLE public.identity_applications (
  identity_id UUID NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identity_id, application_id)
);

CREATE INDEX idx_identity_roles_role ON public.identity_roles(role_id);
CREATE INDEX idx_identity_groups_group ON public.identity_groups(group_id);
CREATE INDEX idx_identity_applications_app ON public.identity_applications(application_id);

-- SoD rules
CREATE TABLE public.sod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_a_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  role_b_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  risk_level public.risk_severity NOT NULL DEFAULT 'critical',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sod_rules_distinct_roles CHECK (role_a_id <> role_b_id),
  CONSTRAINT sod_rules_unique_pair UNIQUE (role_a_id, role_b_id)
);

CREATE TRIGGER sod_rules_updated_at
  BEFORE UPDATE ON public.sod_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Risk findings
CREATE TABLE public.risk_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  severity public.risk_severity NOT NULL,
  status public.risk_status NOT NULL DEFAULT 'open',
  details JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (identity_id, rule_type, status)
);

CREATE INDEX idx_risk_findings_severity ON public.risk_findings(severity, status);
CREATE INDEX idx_risk_findings_identity ON public.risk_findings(identity_id);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.campaign_type NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'draft',
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  entitlement_id UUID NOT NULL,
  department_filter TEXT,
  due_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaign_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  identity_id UUID NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  entitlement_type public.entitlement_type NOT NULL,
  entitlement_id UUID NOT NULL,
  entitlement_name TEXT NOT NULL,
  decision public.review_decision NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, identity_id, entitlement_id)
);

CREATE INDEX idx_campaign_items_campaign ON public.campaign_items(campaign_id);
CREATE INDEX idx_campaign_items_decision ON public.campaign_items(decision);

-- Audit logs (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  actor_id UUID REFERENCES public.profiles(id),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Audit log writer
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (event_type, entity_type, entity_id, actor_id, payload)
  VALUES (p_event_type, p_entity_type, p_entity_id, auth.uid(), p_payload)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Identity audit triggers
CREATE OR REPLACE FUNCTION public.audit_identity_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log('identity.created', 'identity', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log('identity.updated', 'identity', NEW.id, jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    IF OLD.status = 'active' AND NEW.status = 'disabled' THEN
      PERFORM public.write_audit_log('identity.disabled', 'identity', NEW.id, to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_identities
  AFTER INSERT OR UPDATE ON public.identities
  FOR EACH ROW EXECUTE FUNCTION public.audit_identity_changes();

CREATE OR REPLACE FUNCTION public.audit_entitlement_assignment()
RETURNS TRIGGER AS $$
DECLARE
  identity_val UUID;
  entitlement_val UUID;
  payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    identity_val := NEW.identity_id;
    IF TG_TABLE_NAME = 'identity_roles' THEN
      entitlement_val := (to_jsonb(NEW)->>'role_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_groups' THEN
      entitlement_val := (to_jsonb(NEW)->>'group_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_applications' THEN
      entitlement_val := (to_jsonb(NEW)->>'application_id')::uuid;
    END IF;
    payload := jsonb_build_object('identity_id', identity_val, 'entitlement_id', entitlement_val);
    PERFORM public.write_audit_log('entitlement.assigned', TG_TABLE_NAME, identity_val, payload);
  ELSIF TG_OP = 'DELETE' THEN
    identity_val := OLD.identity_id;
    IF TG_TABLE_NAME = 'identity_roles' THEN
      entitlement_val := (to_jsonb(OLD)->>'role_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_groups' THEN
      entitlement_val := (to_jsonb(OLD)->>'group_id')::uuid;
    ELSIF TG_TABLE_NAME = 'identity_applications' THEN
      entitlement_val := (to_jsonb(OLD)->>'application_id')::uuid;
    END IF;
    payload := jsonb_build_object('identity_id', identity_val, 'entitlement_id', entitlement_val);
    PERFORM public.write_audit_log('entitlement.removed', TG_TABLE_NAME, identity_val, payload);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_identity_roles AFTER INSERT OR DELETE ON public.identity_roles FOR EACH ROW EXECUTE FUNCTION public.audit_entitlement_assignment();
CREATE TRIGGER audit_identity_groups AFTER INSERT OR DELETE ON public.identity_groups FOR EACH ROW EXECUTE FUNCTION public.audit_entitlement_assignment();
CREATE TRIGGER audit_identity_applications AFTER INSERT OR DELETE ON public.identity_applications FOR EACH ROW EXECUTE FUNCTION public.audit_entitlement_assignment();

-- RLS policies
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY identities_select ON public.identities FOR SELECT TO authenticated USING (true);
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY groups_select ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY applications_select ON public.applications FOR SELECT TO authenticated USING (true);
CREATE POLICY identity_roles_select ON public.identity_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY identity_groups_select ON public.identity_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY identity_applications_select ON public.identity_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY sod_rules_select ON public.sod_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY risk_findings_select ON public.risk_findings FOR SELECT TO authenticated USING (true);
CREATE POLICY campaigns_select ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY campaign_items_select ON public.campaign_items FOR SELECT TO authenticated USING (true);
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- Admin write access
CREATE POLICY identities_admin_insert ON public.identities FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY identities_admin_update ON public.identities FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY identities_admin_delete ON public.identities FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY roles_admin_all ON public.roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY groups_admin_all ON public.groups FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY applications_admin_all ON public.applications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY identity_roles_admin_insert ON public.identity_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY identity_roles_admin_delete ON public.identity_roles FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY identity_groups_admin_insert ON public.identity_groups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY identity_groups_admin_delete ON public.identity_groups FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY identity_applications_admin_insert ON public.identity_applications FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY identity_applications_admin_delete ON public.identity_applications FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY sod_rules_admin_all ON public.sod_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY risk_findings_admin_all ON public.risk_findings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY risk_findings_reviewer_update ON public.risk_findings FOR UPDATE TO authenticated
  USING (public.is_reviewer_or_admin()) WITH CHECK (public.is_reviewer_or_admin());

CREATE POLICY campaigns_admin_all ON public.campaigns FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY campaigns_reviewer_read ON public.campaigns FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid() OR public.is_admin());

CREATE POLICY campaign_items_admin_all ON public.campaign_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY campaign_items_reviewer_update ON public.campaign_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND (c.reviewer_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND (c.reviewer_id = auth.uid() OR public.is_admin())
    )
  );

-- Audit logs: insert only (via security definer function), no update/delete
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Service role bypass for imports (handled via admin client in server actions)

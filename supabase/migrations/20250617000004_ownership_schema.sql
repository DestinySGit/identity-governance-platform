-- Phase 2: ownership, risk scoring extensions, governance metric snapshots

CREATE TYPE public.review_frequency AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
CREATE TYPE public.criticality_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Role ownership
ALTER TABLE public.roles
  ADD COLUMN owner_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  ADD COLUMN review_frequency public.review_frequency;

CREATE INDEX idx_roles_owner ON public.roles(owner_id);

-- Application ownership
ALTER TABLE public.applications
  ADD COLUMN owner_id UUID REFERENCES public.identities(id) ON DELETE SET NULL,
  ADD COLUMN criticality_level public.criticality_level,
  ADD COLUMN review_frequency public.review_frequency;

CREATE INDEX idx_applications_owner ON public.applications(owner_id);

-- Identity aggregate risk score
ALTER TABLE public.identities
  ADD COLUMN risk_score INTEGER NOT NULL DEFAULT 0
  CONSTRAINT identities_risk_score_range CHECK (risk_score >= 0 AND risk_score <= 100);

CREATE INDEX idx_identities_risk_score ON public.identities(risk_score);

-- Finding point contributions and remediation text
ALTER TABLE public.risk_findings
  ADD COLUMN risk_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN recommendation TEXT NOT NULL DEFAULT '';

-- Governance KPI snapshots for trend tracking
CREATE TABLE public.governance_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  total_users INTEGER NOT NULL DEFAULT 0,
  high_risk_users INTEGER NOT NULL DEFAULT 0,
  critical_findings INTEGER NOT NULL DEFAULT 0,
  sod_violations INTEGER NOT NULL DEFAULT 0,
  dormant_accounts INTEGER NOT NULL DEFAULT 0,
  open_reviews INTEGER NOT NULL DEFAULT 0,
  review_completion_percent INTEGER NOT NULL DEFAULT 0
    CONSTRAINT governance_snapshots_completion_range CHECK (review_completion_percent >= 0 AND review_completion_percent <= 100),
  average_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_snapshots_date ON public.governance_metric_snapshots(snapshot_date DESC);

ALTER TABLE public.governance_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY governance_metric_snapshots_select ON public.governance_metric_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY governance_metric_snapshots_admin_all ON public.governance_metric_snapshots
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

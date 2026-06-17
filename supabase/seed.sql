-- Seed data for Identity_Governance_Platform demo

-- Roles
INSERT INTO public.roles (id, name, description, is_administrative) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Global Admin', 'Full system administrator access', true),
  ('a1000000-0000-4000-8000-000000000002', 'Finance Approver', 'Approve financial transactions', false),
  ('a1000000-0000-4000-8000-000000000003', 'Payment Processor', 'Process outbound payments', false),
  ('a1000000-0000-4000-8000-000000000004', 'Finance Viewer', 'Read-only finance access', false),
  ('a1000000-0000-4000-8000-000000000005', 'HR Admin', 'Human resources administration', false),
  ('a1000000-0000-4000-8000-000000000006', 'Payroll Manager', 'Manage payroll operations', false),
  ('a1000000-0000-4000-8000-000000000007', 'IT Support', 'IT helpdesk access', false),
  ('a1000000-0000-4000-8000-000000000008', 'Sales Rep', 'CRM and sales tools', false),
  ('a1000000-0000-4000-8000-000000000009', 'Engineering Lead', 'Engineering team lead', false),
  ('a1000000-0000-4000-8000-000000000010', 'Security Analyst', 'Security monitoring tools', false);

-- Groups
INSERT INTO public.groups (id, name, description) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'Finance Team', 'Finance department group'),
  ('b1000000-0000-4000-8000-000000000002', 'Payroll Group', 'Payroll processing team'),
  ('b1000000-0000-4000-8000-000000000003', 'IT Operations', 'IT operations staff'),
  ('b1000000-0000-4000-8000-000000000004', 'Engineering', 'Software engineering'),
  ('b1000000-0000-4000-8000-000000000005', 'All Employees', 'Company-wide group');

-- Applications
INSERT INTO public.applications (id, name, description) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'SAP ERP', 'Enterprise resource planning'),
  ('c1000000-0000-4000-8000-000000000002', 'Workday', 'HR and payroll platform'),
  ('c1000000-0000-4000-8000-000000000003', 'Salesforce', 'Customer relationship management'),
  ('c1000000-0000-4000-8000-000000000004', 'GitHub Enterprise', 'Source code management'),
  ('c1000000-0000-4000-8000-000000000005', 'ServiceNow', 'IT service management');

-- Identities (managers inserted first where referenced)
INSERT INTO public.identities (id, first_name, last_name, email, department, job_title, employee_id, status, last_login, manager_id) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'Alice', 'Chen', 'alice.chen@example.com', 'IT', 'IT Director', 'EMP001', 'active', NOW() - INTERVAL '2 days', NULL),
  ('d1000000-0000-4000-8000-000000000002', 'Bob', 'Martinez', 'bob.martinez@example.com', 'Finance', 'CFO', 'EMP002', 'active', NOW() - INTERVAL '1 day', NULL),
  ('d1000000-0000-4000-8000-000000000003', 'Carol', 'Williams', 'carol.williams@example.com', 'Finance', 'Finance Manager', 'EMP003', 'active', NOW() - INTERVAL '5 days', 'd1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000004', 'David', 'Kim', 'david.kim@example.com', 'Finance', 'Payment Specialist', 'EMP004', 'active', NOW() - INTERVAL '120 days', 'd1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000005', 'Eva', 'Johnson', 'eva.johnson@example.com', 'HR', 'HR Director', 'EMP005', 'active', NOW() - INTERVAL '3 days', NULL),
  ('d1000000-0000-4000-8000-000000000006', 'Frank', 'Lee', 'frank.lee@example.com', 'HR', 'Payroll Analyst', 'EMP006', 'disabled', NOW() - INTERVAL '200 days', 'd1000000-0000-4000-8000-000000000005'),
  ('d1000000-0000-4000-8000-000000000007', 'Grace', 'Patel', 'grace.patel@example.com', 'IT', 'Systems Admin', 'EMP007', 'active', NOW() - INTERVAL '1 day', 'd1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000008', 'Henry', 'Brown', 'henry.brown@example.com', 'Sales', 'Account Executive', 'EMP008', 'active', NOW() - INTERVAL '10 days', NULL),
  ('d1000000-0000-4000-8000-000000000009', 'Iris', 'Davis', 'iris.davis@example.com', 'Engineering', 'Senior Engineer', 'EMP009', 'active', NOW() - INTERVAL '4 days', NULL),
  ('d1000000-0000-4000-8000-000000000010', 'Jack', 'Wilson', 'jack.wilson@example.com', 'Security', 'Security Analyst', 'EMP010', 'active', NOW() - INTERVAL '2 days', NULL),
  ('d1000000-0000-4000-8000-000000000011', 'Karen', 'Moore', 'karen.moore@example.com', 'Finance', 'Accounts Payable', 'EMP011', 'active', NULL, 'd1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000012', 'Leo', 'Taylor', 'leo.taylor@example.com', 'Marketing', 'Marketing Manager', 'EMP012', 'active', NOW() - INTERVAL '95 days', NULL);

-- Entitlement assignments
INSERT INTO public.identity_roles (identity_id, role_id) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004'),
  ('d1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005'),
  ('d1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000006'),
  ('d1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000008'),
  ('d1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000009'),
  ('d1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000010'),
  ('d1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000004');

INSERT INTO public.identity_groups (identity_id, group_id) VALUES
  ('d1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-000000000004');

INSERT INTO public.identity_applications (identity_id, application_id) VALUES
  ('d1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000002'),
  ('d1000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000003'),
  ('d1000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000004'),
  ('d1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000005');

-- SoD rules
INSERT INTO public.sod_rules (id, role_a_id, role_b_id, risk_level, description) VALUES
  ('e1000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000002',
   'a1000000-0000-4000-8000-000000000003',
   'critical',
   'Finance Approver and Payment Processor must not be held by the same person'),
  ('e1000000-0000-4000-8000-000000000002',
   'a1000000-0000-4000-8000-000000000005',
   'a1000000-0000-4000-8000-000000000006',
   'high',
   'HR Admin and Payroll Manager separation');

-- Phase 2: role and application ownership (requires identities above)
UPDATE public.roles
SET owner_id = 'd1000000-0000-4000-8000-000000000001', review_frequency = 'quarterly'
WHERE id = 'a1000000-0000-4000-8000-000000000001';

UPDATE public.roles
SET owner_id = 'd1000000-0000-4000-8000-000000000003', review_frequency = 'semi_annual'
WHERE id = 'a1000000-0000-4000-8000-000000000004';

UPDATE public.applications
SET owner_id = 'd1000000-0000-4000-8000-000000000002', criticality_level = 'critical', review_frequency = 'quarterly'
WHERE id = 'c1000000-0000-4000-8000-000000000001';

UPDATE public.applications
SET owner_id = 'd1000000-0000-4000-8000-000000000008', criticality_level = 'high', review_frequency = 'semi_annual'
WHERE id = 'c1000000-0000-4000-8000-000000000003';

-- Sample governance metric snapshot for trend demo
INSERT INTO public.governance_metric_snapshots (
  snapshot_date, total_users, high_risk_users, critical_findings,
  sod_violations, dormant_accounts, open_reviews, review_completion_percent, average_risk_score
) VALUES
  (CURRENT_DATE - INTERVAL '30 days', 12, 2, 1, 1, 3, 0, 0, 15.00),
  (CURRENT_DATE, 12, 3, 2, 1, 3, 0, 0, 22.50);

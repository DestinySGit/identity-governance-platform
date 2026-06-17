# Identity_Governance_Platform

I built this to practice Identity Governance and Administration (IGA) the way most teams experience it before they buy enterprise tooling: spreadsheet-driven access reviews, entitlement sprawl, and separation-of-duties gaps. This app lets me import identity data, surface governance risks, run certification campaigns, and keep an audit trail all in one place.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A free [Supabase Cloud](https://supabase.com) project

> **Why Supabase Cloud instead of Docker?** My machine doesn't support Docker virtualization, so I couldn't run local Supabase with `supabase start`. I linked the project straight to Supabase Cloud instead — see [`docs/SETUP.md`](docs/SETUP.md) for the steps I followed.

### Quick start

```powershell
npm install
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Then run [`supabase/seed.sql`](supabase/seed.sql) in the Supabase SQL Editor, set keys in `.env.local` (see [SETUP.md](docs/SETUP.md)), and:

```powershell
npm run dev
```

Full setup walkthrough: [`docs/SETUP.md`](docs/SETUP.md)

If you do have Docker working locally, the Supabase CLI also supports `supabase start` — that path is documented in SETUP.md as Option B.

### Demo Roles

| Role | Access |
|------|--------|
| `admin` | Full CRUD on identities, entitlements, ownership, SoD rules, campaigns, imports |
| `reviewer` | Read identities; act on assigned campaign items and review queue |
| `viewer` | Read-only across dashboard, explorer, risks, ownership, audit |

Admins can change roles via Supabase dashboard or SQL on the `profiles` table.

After seeding, run **Re-run Analysis** on the Risks page to populate findings and risk scores.

## What it does

**Identity and entitlement data.** I wanted a governed identity store I could actually search and filter, not another tab in a shared spreadsheet. The app supports CRUD on identities, CSV bulk import for users, roles, groups, applications, and entitlements ([sample files](docs/samples/)), and an entitlement explorer that shows each user's access across roles, groups, and apps in one view.

**Risk detection and SoD.** The governance engine flags patterns I kept seeing in real review prep: dormant accounts, orphaned access, excessive privilege, disabled users who still have entitlements, and separation-of-duties conflicts against configurable rules. Each identity gets a 0–100 risk score with contributing factors and remediation text I can act on.

**Reviews, ownership, and audit.** I modeled certification campaigns for applications, roles, and groups, with a review queue for pending, overdue, and completed items. Role and application ownership tracks who is accountable, review frequency, and criticality. Review routing tries to assign certifiers from role owners, app owners, or managers but falls back to manual selection when ownership data is missing. The dashboard surfaces KPIs with drill-down links, and an immutable audit trail (with CSV export) plus per-identity timelines cover the "show your work" side.

## Design decisions

I kept risk scoring **deterministic** — explicit rules, no AI, no external API calls. Explainable findings matter more to me than a black-box score when I'm walking someone through why an account flagged.

I used **Next.js server actions** instead of a separate REST API. For a solo project, that cut down boilerplate and kept auth and Supabase RLS on a straightforward path.

I chose **Supabase** for Postgres, auth, and row-level security without standing up my own backend. **Supabase Cloud** specifically because Docker virtualization isn't available on my dev machine, see SETUP.md for how I wired that up.

Review routing **doesn't guess** when owner or manager data is incomplete. It warns and asks for a manual reviewer rather than silently assigning the wrong person.

## Documentation

- Setup: [`docs/SETUP.md`](docs/SETUP.md)
- CSV import samples: [`docs/samples/`](docs/samples/)

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Link a Supabase cloud project and run migrations: `supabase db push`

## License

MIT

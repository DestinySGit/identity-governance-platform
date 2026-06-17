# Local Setup Guide (Windows)

I used **Supabase Cloud** and not Docker Desktop because it reported that virtualization isn't supported on my hardware, and I didn't want to block development on a BIOS/Hyper-V rabbit hole.

## What you need

| Tool | Notes |
|------|-------|
| Node.js 20+ | I installed via winget |
| npm | Comes with Node |
| Supabase CLI | `npm install -g supabase` |
| Supabase Cloud project | Free tier at [supabase.com/dashboard](https://supabase.com/dashboard) |

---

## Option A: Supabase Cloud (what I use)

### 1. Create a Supabase project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. **New project** → pick a name and password → wait for provisioning.

### 2. Apply database schema

In the project folder:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

`YOUR_PROJECT_REF` is the ID in your project URL: `https://supabase.com/dashboard/project/<project-ref>`.

### 3. Load seed data

In Supabase Dashboard → **SQL Editor** → **New query**:

- Paste the contents of [`supabase/seed.sql`](../supabase/seed.sql)
- Click **Run**

### 4. Configure environment

Dashboard → **Project Settings** → **API**:

- Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 5. Run the app

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up (first user = **admin**), then **Governance Risks** → **Re-run Analysis**.

---

## Option B: Local Supabase (requires Docker)

I didn't use this path since my machine can't run Docker but if you have virtualization enabled and Docker Desktop running, the Supabase CLI can spin up a local stack:

```powershell
npm install
Copy-Item .env.example .env.local -Force
supabase start
```

Copy the **anon** and **service_role** keys from `supabase status` into `.env.local`, then:

```powershell
supabase db reset
npm run dev
```

---

## Verify the app builds

```powershell
npm run build
```


## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm` not recognized | Close and reopen PowerShell after Node install |
| `supabase` not recognized | `npm install -g supabase`, restart terminal |
| Docker / virtualization not available | use Supabase Cloud (Option A) instead of `supabase start` |
| Auth redirect errors | In Supabase → Authentication → URL Configuration, add `http://localhost:3000/**` |
| Fake / disposable email rejected | Supabase blocks many throwaway domains; use a real inbox or create the user in the dashboard |
| `email rate limit exceeded` | Wait ~1 hour, or disable **Confirm email** (Authentication → Providers → Email), or add user manually under Authentication → Users with **Auto Confirm** |
| Empty dashboard after signup | Run seed SQL and **Re-run Analysis** on Risks page |

# UniPath Complete

这是一个完整的可部署版本，包含：

- Supabase 用户注册 / 登录
- 用户 Profile 持久化
- AI Profile Import（GitHub Models）
- 52 校 seed database
- 114 majors
- 第一 / 第二申请方向
- field-aware applicant scoring
- school + major recommendations
- academics / extracurricular recommendations
- saved application plans
- ED / ED II / EA / EA2 / REA / SCEA / RD / RA / UC / UCAS / Rolling
- conflict validation
- early-strategy optimizer
- Monte Carlo application simulator
- AI Counselor
- prediction history
- user feedback
- admin dashboard
- school-data overrides without redeploying code

## Architecture

```text
Browser
  |
  | Supabase Auth
  v
Next.js / Vercel
  |
  | /api/unipath
  +---- GitHub Models (AI parsing + counselor)
  +---- UniPath deterministic admissions engine
  +---- Supabase Postgres (users/profile/plans/history/admin overrides)
```

GitHub Models is used through:

```text
https://models.github.ai/inference/chat/completions
```

The default model is:

```text
deepseek/DeepSeek-V3-0324
```

You can change it using `GITHUB_MODEL`.

---

# Recommended way to replace your current GitHub repository

Do **not** delete files one by one on the GitHub website.

The easiest reliable method is GitHub Desktop:

1. Install GitHub Desktop.
2. Clone your current repository (`easonhxc/ea`).
3. Open the cloned folder in Finder.
4. Delete the old project files **inside the folder**. Do not delete the hidden `.git` folder.
5. Copy every file/folder from this `unipath-complete` project into that folder.
6. GitHub Desktop will show all deletes/additions.
7. Commit with a message such as:
   `Replace prototype with UniPath Complete`
8. Click `Push origin`.
9. Vercel automatically redeploys the same project URL.

Safer alternative: create a brand-new GitHub repository such as `unipath-ai` and import that into Vercel. This avoids old-file conflicts.

---

# 1. Create Supabase

Create a Supabase project.

Open:

```text
SQL Editor
```

Run the entire file:

```text
supabase/schema.sql
```

This creates:

```text
profiles
application_plans
prediction_runs
school_overrides
feedback
```

The app uses Supabase Auth's built-in `auth.users` table for accounts.

---

# 2. Get Supabase keys

In Supabase project settings, get:

```text
Project URL
Publishable / anon key
Service role key
```

The browser receives only the public/publishable key.

The **service role key must only be stored in Vercel**.

---

# 3. Create a GitHub Models token

Use a GitHub Personal Access Token with:

```text
models: read
```

Never commit this token to GitHub.

---

# 4. Vercel Environment Variables

In:

```text
Vercel
→ Project
→ Settings
→ Environment Variables
```

add:

```env
GITHUB_TOKEN=your_github_pat

GITHUB_MODEL=deepseek/DeepSeek-V3-0324

NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ADMIN_EMAILS=your-email@example.com
```

`ADMIN_EMAILS` can contain multiple emails separated by commas.

Example:

```text
owner@example.com,secondadmin@example.com
```

Users whose email appears here see the Admin tab.

---

# 5. Deploy

Import the GitHub repository into Vercel.

Framework:

```text
Next.js
```

Root directory:

```text
./
```

Deploy.

---

# 6. Login behavior

Users can:

```text
Sign up
→ verify email if Supabase email confirmation is enabled
→ log in
→ save profile
→ save school plan
→ view history
```

You can change email-confirmation settings in Supabase Auth settings.

---

# Admin

Admin does not expose secret API keys.

Admin can currently:

- see profile count;
- see saved-plan count;
- see prediction-run count;
- see feedback count;
- see the active GitHub model;
- create JSON overrides for school data.

Example school override:

```json
{
  "sel": 0.08,
  "rank": 17,
  "research": 10,
  "source_note": "2026 official institutional data"
}
```

The prediction engine merges this record over the built-in school database immediately. You do not need to redeploy.

You can later extend override JSON with your own fields such as:

```json
{
  "major_factors": {
    "computer_science": 0.55
  },
  "international_rate": 0.06,
  "year": "2026",
  "source": "official"
}
```

---

# Data warning

The built-in school database is a planning seed dataset. It is **not** a guarantee that every rate, program, policy or application round is current.

For a public product, create a data-update workflow using official university sources and use the Admin override system to keep current-cycle values updated.

---

# Security

Never commit:

```text
GITHUB_TOKEN
SUPABASE_SERVICE_ROLE_KEY
.env
.env.local
```

The included `.gitignore` blocks `.env` and `.env.local`.

The `SUPABASE_SERVICE_ROLE_KEY` is used only by server-side API routes.

The browser uses only:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

---

# GitHub Models free tier

GitHub Models is appropriate for prototype/testing use, but it has model-dependent rate limits.

If usage grows, add:

- per-user daily AI limits;
- IP/user rate limiting;
- bot protection;
- usage counters;
- paid plan;
- model fallback;
- request caching.

The deterministic prediction/simulation endpoints do not require an AI call, so they are cheap.

---

# Product rule

```text
AI understands the applicant.
UniPath calculates the risk.
AI explains the result.
```

Do not let the language model independently invent school-specific admission probabilities.

# DevIQ — Developer Analytics Platform (Frontend)

DevIQ unifies your GitHub, LeetCode, and Codeforces stats into a single developer
score — with AI insights, contribution tracking, head-to-head comparisons, an
in-browser code playground, and an Interview Prep solver with LeetCode-style runs.

This repo holds the **Next.js frontend**. The FastAPI backend lives at
[`saketkhundia/developer-portfolio-backend`](https://github.com/saketkhundia/developer-portfolio-backend).

> **Secrets policy:** never commit `.env`, `.env.local`, or any file containing
> API keys, OAuth secrets, or database URIs. All secrets are documented below
> with placeholder values only.

---

## 1. Tech Stack

| Layer      | Choice |
|------------|--------|
| Framework  | Next.js 15 (App Router), React 18, TypeScript |
| Styling    | Tailwind CSS v4 + inline styles, Chart.js, Monaco editor |
| Auth       | Google + GitHub OAuth (code exchange via backend) |
| Desktop / Mobile | Electron (`electron.js`), Capacitor (`android/`) |
| Backend    | FastAPI (`POST /auth/oauth`, `/leetcode/*`, `/execute`, `/ai/*`) |

Key routes: `/` (dashboard), `/auth/callback/google`, `/auth/callback/github`,
`/api/proxy/[...path]` (dev proxy to the backend).

## 2. Prerequisites

- Node.js 20+ and npm
- Python 3.12+ with the backend running (locally `http://localhost:8000`, or the
  hosted API) — required for login code exchange, LeetCode data, code execution
  and all AI features.

## 3. Environment Variables

Create `.env.local` in the repo root (it is git-ignored):

```bash
# Shown to the browser — public client IDs only, never secrets.
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id

# Backend base URL the app talks to.
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Backend secrets (`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `GROQ_API_KEY`,
`MONGODB_URI`, …) live **only** in the backend's `.env` — never here.

## 4. Run Locally

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build check (also runs TypeScript)
npm start          # serve the production build
```

> After creating or changing `.env.local`, restart `npm run dev` — Next.js
> reads env vars once at startup.

## 5. Google / GitHub Login Setup

OAuth redirects to `${origin}/auth/callback/<google|github>`, so register these
Authorized redirect URIs:

- Google Cloud Console → Credentials → OAuth client:
  `http://localhost:3000/auth/callback/google` (+ your production URLs)
- GitHub → OAuth App → Authorization callback URL:
  `http://localhost:3000/auth/callback/github`

The frontend sends the `code` to `POST {API}/auth/oauth`; the backend keeps
all client secrets server-side.

## 6. Features

- **Dashboard & analytics** — GitHub repos/languages/heatmaps, LeetCode
  solves/ranking/contests, Codeforces rating/history, unified score.
- **Interview Prep** (`PracticePage`) — LeetCode weak-topic detection from live
  per-topic stats; company-tagged problem lists with progress tracking.
- **Problem solver** (`components/ProblemSolver.tsx`) — click any question to
  open a playground prefilled with LeetCode's official starter snippet and full
  statement; ▶ Run executes your `Solution` against the official examples via
  `POST /leetcode/run` (Python/JavaScript/TypeScript); ✨ Solution loads an
  optimal AI solution with Time/Space chips; **Review** gives a DSA-mentor
  verdict (Learning hints vs Full solution) plus an **Optimize** rewrite;
  **See on LeetCode** opens the real problem URL.
- **Playground / Review / Ask AI** — multi-language execution with stdin,
  structured AI code review, optimization, explanations, and chat insights.

## 7. Project Layout

```
app/                 Next.js routes (page, auth callbacks, api proxy)
components/          PlaygroundPage, CodeReviewPage, ProblemSolver, CodeEditor (Monaco)
lib/                 OAuth helpers, API clients
public/              Static assets
android/             Capacitor native shell
electron.js          Electron desktop shell
middleware.ts        Route middleware
```

## 8. Deployment Notes

- `vercel.json` — Vercel/Next.js deployment (`npm run build`).
- `GITHUB_PAGES_DEPLOYMENT.md` — static export flow (the `gh-pages` branch
  hosts the built site; it is deployment output, not source).
- `deploy-cloud-run.sh`, `Dockerfile`, `capacitor.config.ts` — Cloud Run,
  container, Electron/Capacitor packaging helpers.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set` / instant "Google authentication failed" | Restart `npm run dev` after creating `.env.local` |
| `redirect_uri_mismatch` on Google/GitHub | Register the exact callback URLs from §5 |
| OAuth exchange / AI / Run calls fail | Backend must be up: `curl localhost:8000/health`; check `NEXT_PUBLIC_API_BASE_URL` and backend CORS origins |
| Empty AI solution / rate errors | Groq free-tier limits; wait and retry — the solver retries once automatically |
| Monaco "failed to load" | CDN blocked/offline — use the built-in **Use basic editor** fallback |

## License

MIT

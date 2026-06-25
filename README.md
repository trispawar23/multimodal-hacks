# Multimodal Hacks

Hackathon monorepo for **LearnScroll**.

## Deploy on Vercel

The Next.js app lives in **`learnscroll/`** (not the repo root).

### If you see `404: NOT_FOUND` on Vercel

Your project is building the **repo root** (empty) instead of the app. Fix it:

1. Open [Vercel → multimodal-hacks → Settings → General](https://vercel.com/tris23/multimodal-hacks/settings)
2. Set **Root Directory** → `learnscroll` → **Save**
3. Go to **Environment Variables** → add `GEMINI_API_KEY`
4. **Deployments** → open the latest → **Redeploy**

### First-time setup

1. Import `trispawar23/multimodal-hacks` in [Vercel](https://vercel.com/new)
2. Set **Root Directory** → `learnscroll` (required — do not skip)
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy branch: `ui-changes` (latest) or `main`

Without the root directory setting, Vercel deploys an empty folder and every URL shows `404: NOT_FOUND`.

## Local dev

```bash
cd learnscroll
npm install
npm run dev
```

See [learnscroll/README.md](./learnscroll/README.md) for full app docs.

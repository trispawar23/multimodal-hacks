# Multimodal Hacks

Hackathon monorepo for **LearnScroll**.

## Deploy on Vercel

The Next.js app lives in **`learnscroll/`** (not the repo root).

1. Import `trispawar23/multimodal-hacks` in [Vercel](https://vercel.com/new)
2. Set **Root Directory** → `learnscroll` (required)
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy branch: `ui-changes` (latest) or `main`

Without the root directory setting, Vercel will not detect the app and the Git connection will fail or build the wrong folder.

## Local dev

```bash
cd learnscroll
npm install
npm run dev
```

See [learnscroll/README.md](./learnscroll/README.md) for full app docs.

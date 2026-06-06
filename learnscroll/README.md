# LearnScroll

Multimodal educational infinite-scroll app — Gemini-powered voice assistant, AI historical figure characters, adaptive quizzes, and AI-compiled study books.

**Problem:** TikTok and Instagram contain real, high-quality educational content buried under AI slop. LearnScroll surfaces only verified educational content, verified by Gemini.

## Quick Start

```bash
cd learnscroll
npm install
# Add GEMINI_API_KEY to .env.local (get from https://aistudio.google.com/app/apikey)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — works without API key (demo mode with mock data).

## Screens

| Route | Screen | Phase |
|-------|--------|-------|
| `/` | Full-screen reel feed with in-reel voice (mic icon) | 1 |
| `/quiz` | Adaptive quiz from watched content | 2 |
| `/library` | Saved items + book PDF compiler | 1/2 |

Voice is accessed from the feed only — tap the mic icon on any reel to talk with the character.

## API Routes

| Method | Route | What it does |
|--------|-------|-------------|
| `POST` | `/api/feed/generate` | Returns quality-ranked feed items |
| `POST` | `/api/voice/session` | Gemini character voice response |
| `POST` | `/api/quiz/generate` | Generates 5 adaptive questions |
| `POST` | `/api/content/score` | Scores content quality (0–1) |
| `POST` | `/api/book/compile` | Compiles saved items into study guide |

## Tech Stack

- **Framework:** Next.js 15 App Router
- **Styling:** Tailwind CSS (mobile-first, dark theme)
- **AI:** Google Gemini 2.0 Flash (`@google/generative-ai`)
- **Vector store:** Pinecone (Phase 2 — add `PINECONE_API_KEY`)
- **Auth:** Clerk (Phase 2 — add Clerk keys)
- **Database:** PostgreSQL/Supabase (Phase 2)
- **Storage:** Cloudflare R2 for generated PDFs (Phase 2)

## AI Agents

1. **CuratorAgent** — Scores TikTok/IG content quality via Gemini; filters AI slop
2. **VoiceAgent** — Real-time Q&A via Gemini 2.0 Flash; grounded in content transcript
3. **CharacterAgent** — Historical figure persona (Newton, Euler, Curie, Shakespeare, Lincoln)
4. **QuizAgent** — Generates adaptive questions anchored to watched content
5. **BookAgent** — Compiles saved content + notes into structured study guides

## Environment Variables

```
GEMINI_API_KEY=          # Required for AI features
PINECONE_API_KEY=        # Phase 2: vector search
DATABASE_URL=            # Phase 2: user data persistence
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Phase 2: auth
CLERK_SECRET_KEY=        # Phase 2: auth
```

## Responsible AI

- All content scored before entering the feed — threshold > 0.72
- CharacterAgent always shows "AI Character" badge
- VoiceAgent must cite content_id for factual claims
- Under-13 voice features gated behind parental consent
- Medical/legal/self-harm topics auto-blocked by Gemini safety settings

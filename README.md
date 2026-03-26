# Social Intelligence Platform (MVP)

AI-powered discourse analysis engine that turns online conversations into actionable insights.

The app analyzes a topic across web search, Reddit, and YouTube sources, then returns:

- Executive summary
- Key discussion themes
- Sentiment overview
- Platform breakdown
- Emerging trends
- Opportunities
- Contrarian insights

## Step-by-Step Build Plan

1. Set up Next.js + Tailwind foundation and App Router.
2. Implement source connectors in [lib/data](lib/data): Search API, Reddit, YouTube, plus mock fallback.
3. Build the processing pipeline in [lib/pipeline](lib/pipeline): query expansion, filtering, clustering, sentiment, insights.
4. Add AI refinement in [lib/ai/openai.ts](lib/ai/openai.ts) using OpenAI.
5. Add persistent caching and usage tracking with SQLite in [lib/storage/cache.ts](lib/storage/cache.ts).
6. Expose analysis through [app/api/analyze/route.ts](app/api/analyze/route.ts).
7. Build landing + dashboard UI in [app/page.tsx](app/page.tsx) and [components](components).
8. Prepare environment configs, run instructions, and deployment docs.

## Full Project Structure

```
app/
	api/analyze/route.ts        # Main analysis endpoint
	globals.css                 # Design system and global styles
	layout.tsx                  # Metadata + typography
	page.tsx                    # Landing page + app UI

components/
	analysis-dashboard.tsx      # Insight output UI
	loading-state.tsx           # Loading skeleton
	topic-search-form.tsx       # Topic input and quick suggestions

lib/
	ai/
		openai.ts                 # AI enhancement layer
	data/
		index.ts                  # Aggregates all data providers
		mock.ts                   # Mock fallback data
		search.ts                 # Tavily search fetcher
		reddit.ts                 # Reddit fetcher
		youtube.ts                # YouTube Data API fetcher
	pipeline/
		index.ts                  # Pipeline orchestration
		query-expansion.ts        # Query expansion stage
		filtering.ts              # Noise filtering stage
		clustering.ts             # Theme clustering stage
		sentiment.ts              # Sentiment analysis stage
		insight-generation.ts     # Trends, opportunities, contrarian logic
	storage/
		cache.ts                  # SQLite cache + free-tier usage events
	config.ts                   # Runtime config/env parsing
	types.ts                    # Shared app types

.env.example
README.md
```

## Core MVP Features Implemented

- Topic input with interactive landing page section.
- Data aggregation from Tavily Search + Reddit + YouTube.
- Multi-stage processing pipeline:
	- Query expansion
	- Retrieval
	- Noise filtering
	- Theme clustering
	- Sentiment annotation
	- Insight generation
- AI refinement layer (OpenAI) with deterministic fallback logic.
- Cached query responses in SQLite.
- Free-tier usage limit placeholder (daily quota, cookie-based client identity).
- Free-tier source display cap (5 sources) with premium unlock for full source visibility.
- Fallback mock signals when external APIs are unavailable.

## Environment Variables

Copy [.env.example](.env.example) to .env.local and set keys:

- OPENAI_API_KEY: Required for AI-enhanced summaries.
- OPENAI_MODEL: Optional, defaults to gpt-4.1-mini.
- OPENAI_TEMPERATURE: Optional, defaults to 0.2.
- YOUTUBE_API_KEY: Optional but recommended for YouTube signals.
- TAVILY_API_KEY: Optional but recommended for high-quality web search context.
- NEWS_API_KEY: Optional legacy key for optional future expansion.
- CACHE_TTL_MINUTES: Cache duration for repeated topics.
- FREE_TIER_DAILY_LIMIT: Placeholder quota for monetization.
- MAX_SIGNALS_PER_RUN: Upper bound on retrieved signals.
- FREE_SOURCES_VISIBLE_LIMIT: How many sources free users see.
- PREMIUM_SOURCES_VISIBLE_LIMIT: Max sources premium users can expand to.
- PREMIUM_ACCESS_TOKEN: Placeholder premium unlock code.

Without external API keys, the app still works using mock fallback data.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

4. Open http://localhost:3000

## API Contract

POST /api/analyze

Request:

```json
{
	"topic": "remote work"
}
```

Response:

- Analysis object with executiveSummary, keyThemes, platformBreakdown, trends, opportunities, contrarianInsights, sentimentOverview, sampleSources.

## Deployment Instructions

### Option 1: Vercel (recommended)

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add all env vars from .env.example in Vercel Project Settings.
4. Deploy.

Notes:

- The SQLite database file is created at runtime under data/social-intelligence.db.
- For production scale, migrate cache + usage tables to PostgreSQL/Redis.

### Option 2: Self-hosted Node

1. Build:

```bash
npm run build
```

2. Start:

```bash
npm run start
```

3. Put behind Nginx/Caddy if required.

## Monetization Readiness

This codebase is structured so you can add:

- Authentication layer (NextAuth/Clerk) and bind usage events to user IDs.
- Stripe billing for paid tiers.
- Tier-based limits in API route using FREE_TIER_DAILY_LIMIT + plan metadata.

## Known MVP Tradeoffs

- Sentiment and clustering use lightweight heuristics before AI refinement.
- YouTube and News depend on API quota limits.
- SQLite is perfect for MVP, but migrate to PostgreSQL + Redis for scale.

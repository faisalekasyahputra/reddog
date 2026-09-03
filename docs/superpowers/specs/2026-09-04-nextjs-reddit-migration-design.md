# Next.js and Reddit Migration Design

Date: 2026-09-04

## Goal

Migrate the existing single-file static site to the current stable Next.js App Router release, preserve its Windows 98 visual design and interactions, connect the community window to live Reddit data, and make the result deployable on Vercel.

The initial subreddit is `solana`. It will be stored in one server-side constant so it can be changed later without altering the UI.

## Scope

- Rebuild `index.html` as a Next.js App Router page using TypeScript.
- Preserve the current layout, styling, splash screen, draggable windows, start menu, taskbar, and responsive behavior.
- Reuse the existing transparent Snoofi asset for the page logo and favicon.
- Replace the seven meme placeholders with the eleven supplied meme images.
- Load subreddit information and hot posts through a server-side route handler.
- Show an honest error state with a retry action when Reddit is unavailable.
- Prepare the application for deployment to Vercel.

## Non-goals

- Reddit login, voting, commenting, posting, or moderation.
- Database or persistent cache.
- Multi-subreddit selection UI.
- Tailwind, a component library, Reddit SDK, or custom backend service.
- Solana wallet or blockchain integration in this migration.

## Architecture

Use Next.js 16.3.3 with App Router, TypeScript, ESLint, and the default Node.js runtime.

Minimal file structure:

```text
src/
  app/
    api/reddit/route.ts
    globals.css
    icon.png
    layout.tsx
    page.tsx
  components/
    Desktop.tsx
  lib/
    reddit.ts
public/
  assets/character/snoofi-head-transparent.png
  assets/memes/meme-01.avif ... meme-11.avif
```

- `layout.tsx` owns metadata and favicon configuration.
- `page.tsx` is a small server component that renders the desktop.
- `Desktop.tsx` is the single client boundary for the existing interactive UI.
- `globals.css` contains the migrated styles.
- `route.ts` is the public browser-facing endpoint.
- `reddit.ts` contains token acquisition, Reddit requests, and response shaping so the transformation can be tested without HTTP plumbing.

No extra component split is planned unless the migrated client file becomes difficult to maintain.

## UI Migration

The current HTML is the visual source of truth. Its markup, copy, colors, shadows, dimensions, animation timing, and breakpoint behavior will be transferred rather than redesigned.

The existing logo file will be copied into `public/assets/character/` and rendered with `next/image` using explicit dimensions. A copy will also be used as the app icon. Interactive JavaScript will be translated to React state and effects inside `Desktop.tsx`; native CSS will continue to handle visual states where possible.

The eleven supplied PNG files will replace the current gallery placeholders in the order provided by the user. They will be converted once to AVIF at their original pixel dimensions with high-quality 4:4:4 encoding, then compared visually with their sources. The target is visually lossless output with materially smaller files; the PNG sources will remain outside the production bundle. Gallery images will use `next/image`, meaningful alt text derived from their visible subject, explicit dimensions, and lazy loading outside the initial viewport.

## Reddit Data Flow

1. The browser requests `GET /api/reddit`.
2. The route handler requests an app-only OAuth token from `https://www.reddit.com/api/v1/access_token` using HTTP Basic authentication and the `client_credentials` grant.
3. The server requests subreddit metadata and hot posts from `https://oauth.reddit.com/r/solana/...` in parallel.
4. The server returns only the fields used by the UI.
5. The browser renders the live data or an error panel with a retry button.

Required environment variables:

```text
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USER_AGENT
```

Secrets are accessed only by server-side code and are never prefixed with `NEXT_PUBLIC_`.

## API Contract

Successful response:

```json
{
  "community": {
    "name": "solana",
    "title": "Solana",
    "description": "...",
    "subscribers": 123,
    "activeUsers": 45,
    "url": "https://www.reddit.com/r/solana/"
  },
  "posts": [
    {
      "id": "...",
      "title": "...",
      "author": "...",
      "score": 10,
      "commentCount": 2,
      "createdUtc": 1234567890,
      "permalink": "https://www.reddit.com/r/solana/comments/...",
      "thumbnail": null
    }
  ]
}
```

Error response:

```json
{ "error": "Unable to load Reddit community." }
```

The route returns an appropriate non-2xx status for missing configuration, Reddit authorization failure, upstream failure, or malformed upstream data. Internal credentials and raw upstream responses are not exposed.

## Cache, Errors, and Security

- Cache successful Reddit responses for 60 seconds using Next.js server fetch caching.
- Do not cache authorization or upstream error responses intentionally.
- Validate required environment variables before making a request.
- Set Reddit's required descriptive user agent.
- Encode the subreddit segment even though its initial value is a trusted constant.
- Limit the hot listing to 15 posts.
- Keep the current page usable when Reddit fails; replace demo data with an explicit error and retry action.
- External Reddit links open with safe `noopener noreferrer` behavior.

## Verification

- Add one small test for Reddit response shaping, including optional/missing values.
- Run ESLint.
- Run the production build.
- Verify the migrated page in a browser at desktop and mobile sizes.
- Verify successful Reddit rendering with configured credentials.
- Verify the visible error and retry flow with credentials absent or invalid.
- Confirm the logo and favicon retain transparency.
- Confirm all eleven memes render in the intended order without crop regressions.
- Compare AVIF files with their PNG sources at 100% zoom and record total source and output sizes.

## Vercel Deployment

The repository will use standard Next.js defaults so Vercel detects and builds it without custom configuration. Add the three Reddit environment variables in the Vercel project settings for Production and Preview as needed, then deploy through the connected repository or Vercel CLI.

The deployment itself and creation of Reddit credentials require the user's authenticated accounts and are performed only after the local migration passes verification.

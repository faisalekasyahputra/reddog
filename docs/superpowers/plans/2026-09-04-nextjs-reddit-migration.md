# Next.js Reddit Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static site with a Vercel-ready Next.js application that preserves the Windows 98 UI, displays eleven optimized memes, and loads live `/r/solana` data securely.

**Architecture:** A small App Router page renders one client-side desktop component. A Node.js route handler calls a focused Reddit module, caches successful results for 60 seconds, and exposes only the fields the UI needs.

**Tech Stack:** Next.js 16.3.3, React 19, TypeScript, CSS, Node.js built-in test runner, `tsx`, `sharp`, Reddit OAuth, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-04-nextjs-reddit-migration-design.md`

## Global Constraints

- Preserve the existing Windows 98 layout, copy, interactions, animation timing, and responsive behavior.
- Keep `/r/solana` in one server-side constant.
- Keep `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, and `REDDIT_USER_AGENT` server-only.
- Fetch 15 hot posts and cache successful aggregate responses for 60 seconds.
- Use no database, Reddit SDK, Tailwind, UI library, wallet, or blockchain integration.
- Show real errors and retry; never substitute fake Reddit data.
- Store the eleven supplied memes as visually lossless AVIF in their original order and dimensions.

---

### Task 1: Bootstrap Next.js and prepare image assets

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `eslint.config.mjs`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `public/assets/character/snoofi-head-transparent.png`
- Create: `src/app/icon.png`
- Create: `public/assets/memes/meme-01.avif` through `public/assets/memes/meme-11.avif`

**Interfaces:**
- Consumes: `assets/character/snoofi-head-transparent.png` and the eleven user-supplied PNG paths.
- Produces: a runnable Next.js shell and public image URLs `/assets/character/snoofi-head-transparent.png` and `/assets/memes/meme-01.avif` through `/assets/memes/meme-11.avif`.

- [ ] **Step 1: Create the minimal package and framework configuration**

Use these scripts and exact version floor:

```json
{
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "node --import tsx --test src/**/*.test.ts"
  },
  "dependencies": {
    "next": "16.3.3",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "sharp": "^0.34.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.3",
    "tsx": "^4.20.0",
    "typescript": "^5"
  }
}
```

Configure TypeScript with `strict: true`, `noEmit: true`, `moduleResolution: "bundler"`, the Next.js plugin, and the `@/*` alias to `./src/*`. Configure flat ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.

- [ ] **Step 2: Install dependencies with the available package manager**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and installation exits 0. Use `pnpm` because the machine's global `npm` entry point is currently broken.

- [ ] **Step 3: Create the minimal App Router shell**

`layout.tsx` imports `globals.css`, exports metadata title `$SNOOFI 98`, description, and icon `/icon.png`, then renders `children`. `page.tsx` initially renders `<main id="desktop">$SNOOFI 98</main>`. Start `globals.css` with `box-sizing: border-box` and zero body margin; the full legacy CSS moves in Task 2.

- [ ] **Step 4: Copy the character image and favicon**

Copy `assets/character/snoofi-head-transparent.png` byte-for-byte to `public/assets/character/snoofi-head-transparent.png` and `src/app/icon.png`.

Expected: both copied files remain RGBA PNGs and have the same byte length as the source.

- [ ] **Step 5: Convert the eleven memes in the supplied order**

Use `sharp` once per image with this operation:

```js
await sharp(input).avif({ quality: 90, chromaSubsampling: "4:4:4", effort: 6 }).toFile(output)
```

Map the first user path to `meme-01.avif`, the second to `meme-02.avif`, continuing through `meme-11.avif`. Do not resize. Record the source dimensions before conversion and verify the matching AVIF has identical width and height afterward.

- [ ] **Step 6: Check the shell and image outputs**

Run: `pnpm build`

Expected: production build exits 0. Also sum source/output byte sizes and inspect every AVIF at 100% zoom against its PNG source; if visible artifacts exist, raise quality only for the affected file.

No commit is possible until the user initializes or supplies a Git repository.

---

### Task 2: Port the Windows 98 interface

**Files:**
- Create: `src/components/Desktop.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Reference: `index.html`

**Interfaces:**
- Consumes: the public character and meme URLs from Task 1.
- Produces: `Desktop(): JSX.Element`, the interactive page rendered by `page.tsx`.

- [ ] **Step 1: Transfer the static structure and CSS**

Move the visible markup from `index.html` into `Desktop.tsx` as valid JSX and move its stylesheet into `globals.css`. Preserve IDs/classes needed by styling, replace `class` with `className`, and use `next/image` with explicit dimensions for the logo and memes.

Define the gallery in the supplied order:

```ts
const memes = Array.from({ length: 11 }, (_, index) => ({
  src: `/assets/memes/meme-${String(index + 1).padStart(2, "0")}.avif`,
  alt: `Snoofi community meme ${index + 1}`,
}));
```

Remove the seven placeholder prompts and placeholder-on-error UI.

- [ ] **Step 2: Translate legacy DOM handlers into one client component**

Add `"use client"` and React state/effects for:

- boot sequence and skip button;
- active/minimized window state and taskbar buttons;
- start-menu open/close;
- section navigation and buy-link action;
- draggable desktop windows with the same viewport clamping;
- meme carousel offset, arrow controls, hover pause, and reduced-motion behavior;
- canvas background animation with cleanup on unmount.

Use CSS for visibility and selected states. Keep browser globals inside effects or event handlers.

- [ ] **Step 3: Render the client desktop from the server page**

```tsx
import Desktop from "@/components/Desktop";

export default function Page() {
  return <Desktop />;
}
```

- [ ] **Step 4: Check the migrated UI**

Run: `pnpm lint && pnpm build`

Expected: both exit 0. In the browser, verify the splash, skip action, window controls, dragging, taskbar, start menu, navigation, eleven-image carousel, desktop layout, and mobile layout against `index.html`.

No commit is possible until the user initializes or supplies a Git repository.

---

### Task 3: Implement the Reddit server module test-first

**Files:**
- Create: `src/lib/reddit.ts`
- Create: `src/lib/reddit.test.ts`

**Interfaces:**
- Produces: `shapeRedditData(about: unknown, listing: unknown): RedditData` and `fetchRedditCommunity(): Promise<RedditData>`.
- Produces types: `RedditCommunity`, `RedditPost`, and `RedditData`.

- [ ] **Step 1: Write the failing transformation check**

Create one Node test containing representative subreddit and listing payloads, including missing `public_description`, `accounts_active`, and invalid thumbnails. Assert the exact shaped output:

```ts
assert.deepEqual(shapeRedditData(about, listing), {
  community: {
    name: "solana",
    title: "Solana",
    description: "",
    subscribers: 123,
    activeUsers: 0,
    url: "https://www.reddit.com/r/solana/",
  },
  posts: [{
    id: "abc",
    title: "Hello",
    author: "snoofi",
    score: 10,
    commentCount: 2,
    createdUtc: 1234567890,
    permalink: "https://www.reddit.com/r/solana/comments/abc/hello/",
    thumbnail: null,
  }],
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test`

Expected: FAIL because `shapeRedditData` does not exist.

- [ ] **Step 3: Implement the smallest typed transformer**

In `reddit.ts`, define the three public types and validate the two unknown root objects before reading their `data`. Map only the contract fields, coerce missing optional strings/numbers to `""`/`0`, prefix relative permalinks with `https://www.reddit.com`, accept thumbnail URLs only when they begin with `https://`, and cap output to 15 posts. Throw `Error("Invalid Reddit response")` when required root/list structures are absent.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test`

Expected: one test passes.

- [ ] **Step 5: Implement OAuth and parallel Reddit requests**

Add `const SUBREDDIT = "solana"`. `fetchRedditCommunity()` must:

1. Read and validate the three required server environment variables.
2. POST `grant_type=client_credentials` to `https://www.reddit.com/api/v1/access_token` with Basic authentication and the configured user agent.
3. Reject a non-OK response or missing `access_token` without exposing its body.
4. Fetch `/r/solana/about` and `/r/solana/hot?limit=15&raw_json=1` from `oauth.reddit.com` concurrently with the bearer token and user agent.
5. Reject either non-OK response, parse both JSON bodies, and return `shapeRedditData(about, listing)`.

- [ ] **Step 6: Run module checks**

Run: `pnpm test && pnpm lint`

Expected: both exit 0.

No commit is possible until the user initializes or supplies a Git repository.

---

### Task 4: Expose Reddit data and connect the community window

**Files:**
- Create: `src/app/api/reddit/route.ts`
- Modify: `src/components/Desktop.tsx`
- Create: `.env.example`

**Interfaces:**
- Consumes: `fetchRedditCommunity(): Promise<RedditData>` from Task 3.
- Produces: `GET /api/reddit` with the spec's success/error JSON contracts.

- [ ] **Step 1: Create the cached route handler**

Wrap `fetchRedditCommunity` once:

```ts
const getCachedReddit = unstable_cache(
  fetchRedditCommunity,
  ["reddit", "solana"],
  { revalidate: 60 },
);
```

Export `runtime = "nodejs"` and an async `GET` that returns `Response.json(await getCachedReddit())`. On failure, log only the safe error message and return `{ error: "Unable to load Reddit community." }`; use status 500 when a required environment variable is absent and 502 for Reddit/upstream failures. Thrown failures are not cached.

- [ ] **Step 2: Add documented environment names**

Create `.env.example`:

```dotenv
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=web:snoofi98:1.0 (by /u/your_reddit_username)
```

- [ ] **Step 3: Replace the static community demo with live loading**

In `Desktop.tsx`, add `RedditData | null`, loading, error, and retry-counter state. On mount and retry, call `/api/reddit` with `cache: "no-store"`, reject non-OK/error JSON, and render:

- loading text while pending;
- community title, description, subscribers, active users, and 15 hot posts on success;
- `Unable to load Reddit community.` plus a Retry button on failure.

Post links use the API's absolute permalink, open in a new tab, and set `rel="noopener noreferrer"`. The rest of the desktop remains interactive in all three states.

- [ ] **Step 4: Run all automated checks**

Run: `pnpm test && pnpm lint && pnpm build`

Expected: one test passes, lint exits 0, and the production build exits 0.

- [ ] **Step 5: Verify browser behavior and Vercel readiness**

Run `pnpm dev`, then verify desktop and mobile widths. With no `.env.local`, confirm the error and Retry button. With valid Reddit variables, confirm `/r/solana` metadata and hot posts render and that secrets do not appear in browser source or client bundles.

Confirm Vercel detects Next.js without a custom `vercel.json`. Add the three environment variables in Vercel project settings only when deploying through the user's authenticated account.

No commit is possible until the user initializes or supplies a Git repository.

# ytSort

Sort a YouTube playlist by name, date added, publish date, view count, or
duration - criteria YouTube itself won't let you sort by.

## Structure

- `packages/core` - framework-agnostic TypeScript: YouTube Data API calls,
  the sort comparators, and the minimal-moves reorder algorithm. No Next.js
  or Node-only dependencies, so it can be reused as-is by a future Electron
  or React Native (iOS) app.
- `apps/web` - the Next.js app (the only app for now).

## One-time Google Cloud setup

1. Create or select a project at [console.cloud.google.com](https://console.cloud.google.com/).
2. Enable the **YouTube Data API v3** (APIs & Services -> Library).
3. Configure the **OAuth consent screen**: External, keep it in **Testing**
   mode, add the scope `https://www.googleapis.com/auth/youtube`, and add
   your own Google account (and anyone else you want to let in) as a test
   user. Testing mode avoids Google's app-verification review, which is
   otherwise required for this scope.
4. Create an **OAuth Client ID** (Application type: Web application) with
   authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google`
5. Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in:
   - `AUTH_SECRET` - generate with `npx auth secret`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - from the OAuth client you just created

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000> and sign in with a test-user Google
account. Use "Switch account" in the header to work on a different
Google/YouTube account.

## Running the core package's tests

```bash
npm test
```

## Notes on YouTube API quota

Moving one video within a playlist (`playlistItems.update`) costs 50 quota
units against a default 10,000/day project quota - about 200 moves/day. The
sort screen shows how many videos actually need to move before you apply a
sort (it only moves items that are out of place), and the count next to
"Apply sort" is a rough estimate of the quota it will use.

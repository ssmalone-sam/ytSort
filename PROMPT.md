# Prompt Log

Tracks every prompt given to Claude while building ytSort: the model used,
what was being worked on, and the outcome. Chronological order. The model
has been **Claude Sonnet 5** (`claude-sonnet-5`) for the whole project so
far, so it's only called out where it might matter later (e.g. after a
model change).

Secrets shared in a prompt (OAuth client secrets, etc.) are redacted here -
see git-ignored `.env.local` for actual values.

---

### 1. Initial app proposal
**Working on:** Starting from an empty repo.
**Prompt:** "I would like to build a small app that allows a user to sort a youtube playlist in different ways that are not necessarily allowed by YouTube or YouTube Studio. The user should be able to login into YouTube, switch to the desired account, pick a playlist, and then pick the sort method. The sort needs to include by name, added date, created date, etc. How would you propose this to be created?"
**Outcome:** Entered plan mode; asked clarifying questions (platform, audience/OAuth verification tradeoffs, sort criteria to launch with); drafted an initial architecture plan.

### 2. Future Electron/iOS reuse
**Working on:** Refining the plan before approval.
**Prompt:** "while this will start as a web app, make sure this could also have a electron and ios abiliyt later on."
**Outcome:** Redesigned the plan around a monorepo (`packages/core` framework-agnostic logic + `apps/web`), so a future Electron or React Native app could reuse the YouTube API/sort logic without a rewrite. Plan approved; scaffolded the whole project (Next.js + Auth.js, `packages/core` with the sort/diff algorithm, tests, README).

### 3. Commit
**Prompt:** "commit"
**Outcome:** Committed the initial scaffold.

### 4. Push
**Prompt:** "push"
**Outcome:** Pushed to `origin/main`.

### 5. Create a dev branch
**Prompt:** "create a dev branch and start working from it"
**Outcome:** Created and pushed `dev`, switched to it. All subsequent work happened here.

### 6. Cloudflare tunnel / Google settings
**Working on:** Accessing the local dev server from a public URL.
**Prompt:** "I'm going to be access this via cloud flare on the foloowing URL for local dev test: ytsort.slashsam.net how does this affect teh google settings?"
**Outcome:** Explained the required Google Cloud Console changes (redirect URI, JS origin, authorized domain) and added `allowedDevOrigins` + optional `AUTH_URL` support in the app; documented both in the README.

### 7. Move to port 3007
**Prompt:** "move this over to port 3007"
**Outcome:** Updated `dev`/`start` scripts and README references from port 3000 to 3007; verified the server actually binds there.

### 8. Set up Google auth variables
**Prompt:** "can we setup the goole auth varibles"
**Outcome:** Generated a real `AUTH_SECRET`, created `.env.local` (git-ignored), and fixed the README's `AUTH_SECRET` generation instructions after discovering `npx auth secret` now resolves to an unrelated `better-auth` CLI, not Auth.js's. Asked the user for their Google OAuth Client ID/Secret.

### 9. OAuth credentials provided
**Prompt:** "here is the client id: [redacted] adn the client secret: [redacted]"
**Outcome:** Wrote both into `.env.local`, started the dev server, and verified `/api/auth/providers` correctly builds Google sign-in/callback URLs against the tunnel domain.

### 10. `org_internal` sign-in error
**Working on:** First real sign-in attempt.
**Prompt:** "I'm getting this error on a youtube account hat I have access to: Access blocked: ytSort-dev can only be used within its organization ... Error 403: org_internal"
**Outcome:** Diagnosed the OAuth consent screen's User Type being set to Internal (restricted to a Workspace org) instead of External; gave the fix steps (switch to External, add test users).

### 11. Which account owns the channel?
**Prompt:** "How do I find the account that owns Volleyball_Raw_Footage, I thought it was scott@ssmalone.net which is what I loged in with"
**Outcome:** Explained Brand Accounts (`myaccount.google.com/brandaccounts`) and clarified that `org_internal` is unrelated to channel ownership - it would block the rightful owner too if their account isn't in the project's Workspace org.

### 12. `insufficientPermissions` / scope error
**Prompt:** "I seem to be passed the login but I'm getting this error now: ... 403 Forbidden ... Insufficient Permission ... ACCESS_TOKEN_SCOPE_INSUFFICIENT ..."
**Outcome:** Diagnosed that the `youtube` scope (a restricted scope) wasn't registered on the OAuth consent screen's scope list, so Google silently dropped it from the granted token. Gave fix steps: add the scope on the consent screen, revoke the app's existing grant, sign in again.

### 13. `manualSortRequired` error
**Working on:** First attempt to apply a sort.
**Prompt:** "I'm in, trying to apply a sort I get this: ... 400 Bad Request ... Playlist sort type need to be MANUAL to support position. ..."
**Outcome:** Explained that a playlist's YouTube "Sort by" must be set to Manually before the API allows position-based reordering (a UI-only setting, not readable/writable via the Data API). Then proactively improved error handling: a `YouTubeApiError` class carrying the API's reason code, a typed result from the reorder server action, and a UI message with a link to fix it on YouTube.

### 14. "Load failed" after applying a sort
**Prompt:** "changed to manual but getting this error: ... Runtime TypeError ... Load failed"
**Outcome:** Found in the dev server log that the sort had actually already succeeded (492ms) before the error; traced it to the automatic post-action `revalidatePath` refresh failing over the tunnel. Removed the `revalidatePath` call since the UI already updates optimistically.

### 15. Current-order view + way back to playlist list
**Prompt:** "can you allow a view to show the current sort order? Also, after a sort is comlete, there is now way back to the list of playlist to change another one"
**Outcome:** Added "Current order" as a sort mode (now the default) so the live order is visible without picking a criterion first, and added an explicit "All playlists" link on the playlist detail page.

### 16. Validate Manual sort before applying
**Prompt:** "can you validate if the manual option is set before the user even applies the sort?"
**Outcome:** Added `isManualSortEnabled` (core) and a `checkManualSort` server action - since the setting isn't exposed by the API, this works by attempting a real (then-reverted) position change - surfaced as a check that runs the first time a real sort mode is picked, with a warning banner if disabled.

### 17. Highlight the warning box
**Prompt:** "can the set to manual warning box be better highlighted, could it be in a yellow box or something like that?"
**Outcome:** Restyled the plain warning text as a bordered amber callout box with a warning icon.

### 18. Bright yellow, specifically
**Prompt:** "I would like the maual warning box to have a bright yellow border with a back ground that is light yellow opaque"
**Outcome:** Swapped the muted amber styling for a solid bright-yellow border and opaque light-yellow background.

### 19. "I don't see any yellow"
**Working on:** Testing the warning box on a playlist not set to Manual sort.
**Prompt:** "I don't see any yellow" (clarified: picked a real sort mode on a playlist not yet set to Manual, and the warning still didn't appear)
**Outcome:** Found the real bug: the check re-applied a video's own current position as a "safe" test, which YouTube accepts as a no-op without ever validating the sort-order constraint - always reporting "enabled" regardless of the real setting. Fixed it to request a genuinely different position and revert it afterward, which actually exercises the check.

### 20. Restart dev server
**Prompt:** "restart dev serer"
**Outcome:** Killed the stale dev server process(es) holding port 3007 and started a fresh one.

### 21. Caching explanation
**Prompt:** "it was a caching issue"
**Outcome:** Acknowledged, and noted the no-op logic bug fixed in #19 was real and independent of any caching.

### 22. "Can you rename video as well?"
**Prompt:** "Can you rename video as well?"
**Outcome:** Built full inline video-title renaming (pencil icon per row, `updateVideoTitle` in core, a `renameVideo` server action). Turned out to be a misread - see #23.

### 23. Correction: not a request
**Prompt:** "I did not actually ask you to rename anything"
**Outcome:** Clarified the question was feasibility-only, not a build request; asked whether to keep or revert the feature just built.

### 24. Clarification and revert
**Prompt:** "I just wanted to know of possible" (i.e. was just asking if it was possible)
**Outcome:** Confirmed renaming is possible via `videos.update`; user chose to revert. Cleanly reverted the inline-rename commit (`git revert`), verified tests/build still pass. Saved a feedback memory: treat "can you X" as a feasibility question by default, not an implicit build request.

### 25. Regex-based batch rename
**Working on:** A real, scoped version of the renaming idea.
**Prompt:** "ok, what I would like the ability to change the name of video in a playlist based off a regex when the sort type is choosen as by name. An example of what I'm want that to do is be able to change the beginning of a file name from (1) to (01)"
**Outcome:** Added a find/replace regex panel shown only in Name sort mode: `previewRegexRename` (pure, unit-tested, no network calls while typing) for a live preview of every title that would change, plus an `applyRegexRename` server action that renames matched videos one at a time, tolerating individual failures.

### 26. `quotaExceeded` error
**Prompt:** "I getting this: ... 403 Forbidden ... The request cannot be completed because you have exceeded your quota. ..."
**Outcome:** Explained the daily 10,000-unit project quota had been exhausted by testing (resets at midnight Pacific). Offered, and then added, a friendly error page (`app/playlists/error.tsx`) for quota-exceeded and other load failures instead of Next's raw crash overlay.

### 27. Checking usage
**Prompt:** "are you able to show how many units that have been used according to google?"
**Outcome:** Explained there's no API-exposed way to read current usage with the same credentials - only Google Cloud Console shows it. Offered (not yet built) an app-side estimate of ytSort's own usage as an alternative.

### 28. Does browsing cost quota?
**Prompt:** "does pulling up the list of video in a playlist go against the quota or only when the sorting in done?"
**Outcome:** Explained viewing a playlist is cheap (a handful of 1-unit `list` reads), while the Manual-sort check (50-100 units) and actual writes (moves/renames) are what really consume quota.

### 29. Application vs. user quota
**Prompt:** "does this quota based of the applicaiton or the user connected?" / "is this quota based of the applicaiton or the user connected?"
**Outcome:** Clarified the 10,000/day quota is scoped to the Google Cloud project (the app), shared by every signed-in user - not a separate allowance per account. Flagged the implication for opening ytSort up to more people later.

### 30. How high can it go?
**Prompt:** "how high can the quota be?"
**Outcome:** Explained there's no published ceiling; increases are discretionary and historically hard to get for small/personal YouTube API apps.

### 31. Document it in the README
**Prompt:** "add a quota increase request note to the readme"
**Outcome:** Added a README section covering per-call costs, the project-wide (not per-user) scope, where to check usage, and how to submit a quota increase request.

### 32. Warn before switching sort modes
**Prompt:** "can it warn before switching sort modes about the cost"
**Outcome:** Made the Manual-sort check opt-in via a "Check now" button with the cost stated upfront, instead of running automatically the moment a real sort mode is picked - so previewing sorts is always free.

### 33. `CLAUDE.md` rules
**Prompt:** "I would like to create a claude.md file with some rules. 1) do not push, commit, open PR, or merge within git unless explicitly told so. 2) Update all .md file and help files only whne a push is done."
**Outcome:** Created `CLAUDE.md` with both rules. Left uncommitted per rule 1.

### 34. `CHANGELOG.md`
**Prompt:** "create a changelog.md file that tracks all the changs that have been created. This should also track versions."
**Outcome:** Created `CHANGELOG.md` in Keep a Changelog style, reconstructing versions 0.1.0-0.2.3 from the git history (skipping the rename-then-revert as a net no-op), with an `[Unreleased]` section for pending uncommitted work. Left uncommitted per rule 1.

### 35. `PROMPT.md`
**Prompt:** "create a prompt.md file that keeps track of all the prompts used in claude, the model that was used, what was being worked on with the prompt, and the outcome of the prompt."
**Outcome:** This file.

### 36. Countdown on the quota-exceeded page
**Prompt:** "can you had a count down on the quota reached page, the gives how long until midnigh pacific standard time?"
**Outcome:** Added `apps/web/lib/quota-reset.ts` (DST-aware calculation of time remaining until next midnight Pacific, verified against sample PDT/PST instants) and a live `HH:MM:SS` countdown on the quota-exceeded error page, ticking every second.

### 37. Commit and push
**Prompt:** "commit and push this"
**Outcome:** Per `CLAUDE.md` rule 2, updated `CHANGELOG.md` (versions 0.2.4-0.2.6) and this file to cover everything pending, then committed and pushed `CLAUDE.md`, `CHANGELOG.md`, `PROMPT.md`, and the quota countdown feature together.

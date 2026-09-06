# Changelog

All notable changes to this project are documented here, newest first.
Versions follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH).
These version numbers are for tracking history in this file only - they
aren't currently tied to any published package or git tag.

## [0.2.6] - 2026-09-06

### Added

- A live `HH:MM:SS` countdown to midnight Pacific Time on the
  quota-exceeded error page, so it's clear exactly how long until the
  daily API quota resets instead of just "midnight Pacific."

## [0.2.5] - 2026-09-06

### Added

- `PROMPT.md` - a chronological log of every prompt given to Claude on
  this project: what was being worked on and the outcome.

## [0.2.4] - 2026-09-06

### Added

- `CLAUDE.md` - agent instructions: don't `commit`/`push`/open a PR/merge
  unless explicitly told to, and only update `.md`/help files at push time.
- `CHANGELOG.md` - this file.

## [0.2.3] - 2026-09-05

### Changed

- The Manual-sort check (whether a playlist's YouTube "Sort by" setting
  allows reordering) is now opt-in via a "Check now" button instead of
  running automatically the moment a real sort mode is picked, so just
  previewing different sorts never silently spends quota.

## [0.2.2] - 2026-09-05

### Documentation

- README: documented that the 10,000/day API quota is scoped to the
  Google Cloud project (shared across every signed-in user, not per
  account), how to check current usage in Google Cloud Console, and how
  to request a quota increase.

## [0.2.1] - 2026-09-05

### Added

- A friendly error page for `/playlists` and `/playlists/[id]` (e.g.
  quota exceeded, network errors) instead of Next.js's raw crash overlay.

## [0.2.0] - 2026-09-05

### Added

- Batch rename via regex find/replace, shown only when sorting by Name -
  e.g. zero-padding "(1)" to "(01)" so a name sort orders numbers
  numerically instead of lexically. Includes a live preview (no network
  calls while typing) and an estimated quota cost before applying.

## [0.1.9] - 2026-09-05

### Fixed

- The Manual-sort check was giving false negatives: it tested by
  re-applying a video's own current position, which YouTube accepts as a
  no-op without ever validating the sort-order constraint. Now it
  requests an actually different (neighboring) position and reverts it
  if that succeeds, so the check reflects the playlist's real setting.

## [0.1.8] - 2026-09-05

### Changed

- Restyled the Manual-sort warning as a highlighted callout box (bright
  yellow border, opaque light-yellow background, warning icon) instead
  of a plain line of colored text.

## [0.1.7] - 2026-09-05

### Added

- A check for whether a playlist's YouTube "Sort by" is set to Manually -
  the only mode that supports position-based reordering via the API.
  Surfaced as a warning before Apply is even clicked, with a link to fix
  it on YouTube.

## [0.1.6] - 2026-09-05

### Added

- A "Current order" sort mode (now the default) so the playlist's live
  order is visible without picking a specific sort criterion first.
- An "All playlists" link on the playlist detail page.

## [0.1.5] - 2026-09-05

### Fixed

- Removed the `revalidatePath` call after applying a sort - it triggered
  an automatic follow-up network request that could fail over an
  unreliable connection (e.g. a dev tunnel) even though the sort itself
  had already succeeded, surfacing a confusing "Load failed" error.

## [0.1.4] - 2026-09-05

### Added

- Actionable handling for YouTube's `manualSortRequired` error: instead
  of crashing, the sort screen explains that the playlist's sort order
  must be set to Manual on YouTube first, with a link to fix it.

## [0.1.3] - 2026-09-05

### Documentation

- README: corrected the `AUTH_SECRET` generation instructions - `npx auth
  secret` now resolves to an unrelated `better-auth` CLI; use `openssl
  rand -base64 32` instead.

## [0.1.2] - 2026-09-05

### Changed

- Moved the dev server from port 3000 to port 3007.

## [0.1.1] - 2026-09-05

### Added

- Support for accessing the dev server through a Cloudflare Tunnel
  (`ytsort.slashsam.net`): `allowedDevOrigins` in `next.config.ts`, an
  optional `AUTH_URL` env var, and matching Google OAuth client/consent
  screen setup steps in the README.

## [0.1.0] - 2026-09-05

### Added

- Initial scaffold: an npm-workspaces monorepo with `packages/core`
  (framework-agnostic YouTube Data API client, sort comparators, and a
  minimal-moves reorder algorithm using an LIS-based diff) and `apps/web`
  (Next.js + Auth.js Google sign-in), so a future Electron or iOS app can
  reuse the core logic without a rewrite.
- Sign in with Google, switch accounts, pick a playlist, and sort it by
  name, date added, date published, view count, or duration.
- Apply a sort using the fewest possible `playlistItems.update` calls,
  with an estimated quota cost shown before committing.

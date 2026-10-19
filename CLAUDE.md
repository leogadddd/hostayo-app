# Hostayo

## Database schema changes

Every change to `src/lib/db/schema/*` (new column, table, index, enum value,
default, constraint) ships with a migration in the same change. A schema edit
without a migration makes queries fail at runtime with errors like
`column "x" does not exist`.

1. Edit the schema in `src/lib/db/schema/`.
2. Generate the migration: `npm run db:generate -- --name <what_changed>`
   (e.g. `add_unit_wifi_password`). Never hand-write a migration without also
   committing the matching `drizzle/meta/NNNN_snapshot.json`; drizzle-kit
   diffs against the latest snapshot, so a missing one makes the next
   generate re-create things that already exist.
3. Read the generated SQL. New `NOT NULL` columns on existing tables need a
   `DEFAULT` or a backfill, or the migration fails on tables with data.
   Also check the ordering: a composite foreign key needs its target unique
   index created first. drizzle-kit may emit `CREATE UNIQUE INDEX` after the
   `ADD CONSTRAINT ... FOREIGN KEY` that depends on it (0012_amenities had
   to be reordered by hand).
4. Check the new `drizzle/meta/_journal.json` entry: its `when` must be larger
   than every earlier entry's. The migrator silently skips a migration older
   than the last applied one, and 0008–0011 were hand-dated into late
   September 2026, so bump `when` past 1790668800000 until the real clock
   passes it.
5. Apply it: `npm run db:migrate` (runs `scripts/migrate.ts`). It prints the
   target database and either "Applied N migrations", "Already up to date",
   or the real Postgres error. Check the host before migrating: `.env`
   decides which database it touches.
6. Check nothing is left over: run `npm run db:generate` again. It must print
   `No schema changes, nothing to migrate`.
7. Run `npm run test:integration` (applies all migrations to `hostayo_test`
   from scratch) and exercise the affected pages in `npm run dev`.

Commit the schema edit, the `.sql` file, `drizzle/meta/_journal.json`, and the
new snapshot together. New migrations use timestamp file prefixes (see
`drizzle.config.ts`) because index prefixes collided after 0004 was skipped.
Don't edit a migration that has already been applied anywhere; add a new
one. Don't use `db:push` for real changes, since it skips the migration
history.

## Amenities

Each organization has its own amenity catalog (`amenities`, scoped
`property` or `unit`). Defaults live in `src/lib/amenities.ts`; new
organizations get them in `createOrganization`, and
`npm run seed:amenities` backfills existing organizations (idempotent).
Adding a default means updating that list, its icon in
`amenity-icons.tsx`, and rerunning the seed.

## Booking platforms

Each organization has its own list of booking platforms (`booking_platforms`:
Direct, Airbnb, Booking.com, …); a reservation's `platform_id` says where it
came from. Defaults live in `src/lib/platforms.ts` with logos in
`public/platforms/` (same-origin only: the production CSP blocks external
images). New organizations get them in `createOrganization`, and
`npm run seed:platforms` backfills existing organizations (idempotent).
Retire a platform with `is_active = false` instead of deleting it; past
reservations still reference it.
Teams manage their list at Settings → Booking platforms (`platforms.*`
permissions): built-in or used platforms are archived there, only unused
custom ones are deleted. `down_payment_applies` directly controls whether a
unit's down payment (`src/lib/reservation-fee.ts`) applies to bookings from
that platform.

## Pricing rules

Account-wide nightly price rules (`pricing_rules`, `src/lib/pricing-rules.ts`)
sit on top of a unit's regular and day-of-week rates. A rule has optional
dates (optionally repeating yearly), optional weekdays, a target (all units,
properties, or single units; a property covers units added later) and an
adjustment (percent, amount or fixed price). Among the rules matching a night
the highest `priority` non-stacking rule wins; stacking rules always apply on
top, highest priority first. `resolveNightlyRate` is the one place that
decides a night's price; callers pass `unitRateResolver(unit, rules)` as
`rateFor` to `accommodationLines` / `buildDefaultCharges`. Reservations
snapshot their charges, so changing a rule never reprices a booking. Teams
manage rules at Pricing (`pricing.*` permissions). The guest-facing unit page
(`/h/...`) still prices by weekday rates only.

## L1 operators

`system_admins` lists L1 operators, who get owner access to every
organization without a membership (`listAccessibleOrganizations`). Manage
them on the Accounts page (Grant L1 / Revoke L1: confirmation plus the
acting operator's own password; you can't revoke yourself or the last
operator) or with `npm run l1 -- list | grant <email> | revoke <email>`.

## Sign-up access

Three modes, decided by env flags in `src/lib/flags.ts` and read per request:
open (default), invite-only (`REGISTRATION_INVITE_ONLY=true`) and closed
(`REGISTRATION_DISABLED=true`, the shared demo; it wins). The rule for
invite-only lives in `admitSignUp` (`src/server/registration/service.ts`) and
is enforced by Better Auth's `user.validateUserInfo` in `src/lib/auth/index.ts`;
`/register` only decides what to show. Early-access links (`registration_invites`,
one sign-up each by default, digest only) are managed with
`npm run invite -- create [who] [--uses N] [--days N] | list | revoke <id>`;
there is no UI for it. A pending team invitation for the same email also
admits a sign-up. Calls to `auth.api` with no HTTP request (seeds, demo reset)
skip the gate.

## Early-access inbox

The marketing site (`hostayo-page`) POSTs every early-access request to
`/api/early-access` (`Authorization: Bearer $EARLY_ACCESS_API_SECRET`, same
value on both sides) before it emails the team, so a request survives a failed
email. Rows live in `early_access_requests`; `readAt` null means new. L1
operators work them at `/early-access` (sidebar: Early access); everyone else
gets a 404 and each server action re-checks L1.

- **Accept** (or **Add entry**, which accepts straight away) makes a one-use
  sign-up link (`registration_invites`) and emails a welcome with it
  (`acceptEarlyAccessEntry`; mail goes through `src/lib/mailer.ts`, Resend or
  Gmail, sender from `MAIL_FROM` or `EARLY_ACCESS_FROM`). If the email fails
  the entry stays accepted with `welcomeSentAt` null ("Email not sent"); the
  paper-plane button sends a fresh link.
- The account created with the link is stored on the entry (`user_id`, set by
  the `databaseHooks.user.create.after` hook in `src/lib/auth/index.ts`, by link,
  falling back to the entry's email).
- **Revoke** blocks that account (signed out everywhere, can't sign in) and
  kills the link; with no account yet it only kills the link and returns the
  entry to pending. **Restore** unblocks the account.
  CLI: `npm run early-access -- list | revoke <email> | restore <email>`.

## Accounts and workspaces (L1)

L1 operators manage every account at `/accounts` and every workspace at
`/workspaces` (sidebar: L1 operator). Both pages 404 for everyone else and
their server actions go through `l1Action` (`src/server/l1-action.ts`), which
re-checks L1.

- Accounts (`src/server/accounts/service.ts`): create (temporary password shown
  once, no email), edit name/email, reset password (new temporary password,
  signs the account out everywhere), block/unblock, delete, and last login.
  `user.blocked_at` is enforced in `databaseHooks.session.create.before`, the one
  place every sign-in passes through, and blocking deletes existing sessions.
  `user.last_login_at` is stamped in `session.create.after`. L1 operators, the
  demo account and yourself can't be blocked or deleted; the only owner of a
  workspace can't be deleted. CLI:
  `npm run accounts -- list | block <email> [reason] | unblock <email> | reset-password <email> | delete <email>`.
- Workspaces (`src/server/workspaces/service.ts`): create (for an existing
  account), edit name/slug, block/unblock, delete (type the name; cascades
  everything, uploaded files stay in storage). A blocked workspace
  (`organizations.blocked_at`) can't be opened by its members
  (`requireMembership` sends them to `/workspace-blocked`); L1 still can. Its
  public pages (`/h/...`, guest links) keep working.

## Guest reviews

One review per stay, per unit, rolled up per workspace. Scoring is pure code in
`src/lib/reviews.ts` (`REVIEW_ALGO_VERSION`; bump it when a constant or formula
changes); the database work is `src/server/reviews/service.ts`.

- **Verified** reviews come from a review link (`review_links`, own table so it
  can never open `/g/...`): the owner creates it on a checked-out reservation
  (Guest review card; `guests.update`), the guest opens `/r/[token]`. They
  publish immediately. One per reservation.
- **Community** reviews come from the open form at `/h/[host]/[unit]/review`.
  They wait as `pending` until a host with `reviews.update` publishes them or
  matches them to a checked-out stay (which makes them verified). One per
  reviewer fingerprint per unit per 90 days (`fingerprint_hash`, salted).
- Hosts can reply, publish, hide and restore; never edit or delete. Private
  feedback is only for verified reviews and never leaves `listOrgReviews`
  (`listPublicReviews` doesn't select it).
- Scoring signals (`source`, `payment_verified`, `stay_check_out_at`) are
  snapshotted on the row, so scores can be recomputed without the reservation.
  Trust weight, 12-month half-life decay and a Bayesian prior (`rankingScore`,
  for a marketplace to sort by) are separate from `displayRating` (what guests
  see; `null` shows "New" until 3 verified reviews). Community weight is capped
  at 20% of the combined total. Scores are computed on read from the published
  rows; add cached score tables when the marketplace needs them.
- Public pages show per-unit reviews (`/h/[host]/[unit]`) and the workspace
  roll-up (`/h/[host]`), with `aggregateRating` in the JSON-LD once a score
  shows. The app inbox is Reviews (`reviews.view` / `reviews.update`).

## UI copy: helper text goes in an info tooltip

Never write helper text as a visible paragraph under a field, card, choice
card, heading or dialog. Put it in an info badge with a tooltip instead, using
`InfoTip` (`src/components/ui/info-tip.tsx`):

- Field labels: `<Label htmlFor="x" info="Explanation">Name</Label>`.
- Headings: put `<InfoTip>…</InfoTip>` beside the heading (see `FormSection`,
  whose `description`/`hint` already render as a tooltip).
- Choice cards: set `description` on the option; `ChoiceCards` shows it as a
  badge in the card's top-right corner. Never render it inline.
- Do not nest `InfoTip` inside another button; position it as a sibling.

Applies to explanations, hints, caveats, formats and limits ("JPG up to 4
MB"), time estimates and privacy notes. Still shown inline: error and
validation messages, empty states, counts, timestamps, balances and progress
figures, and `aria-label`s.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

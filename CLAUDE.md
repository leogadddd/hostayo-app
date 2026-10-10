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

## L1 operators

`system_admins` lists L1 operators, who get owner access to every
organization without a membership (`listAccessibleOrganizations`). Manage
them with `npm run l1 -- list | grant <email> | revoke <email>`; there is no
UI for it by design.

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
operators read them at `/early-access` (sidebar: Early access), where they can
mark requests read or unread and delete them. Everyone else gets a 404, and
each server action re-checks L1.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { PageHeading } from "@/components/app/page-heading";
import { PermissionDenied } from "@/components/app/permission-denied";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTip } from "@/components/ui/info-tip";
import { TabBar } from "@/components/ui/tab-bar";
import { formatRating, MIN_VERIFIED_FOR_SCORE } from "@/lib/reviews";
import { listOrgUnits } from "@/server/inventory/service";
import {
  countPendingReviews,
  getReviewSummaries,
  listMatchableStays,
  listOrgReviews,
} from "@/server/reviews/service";
import { ReviewCard, type ReviewCardData } from "./review-card";

export const metadata: Metadata = { title: "Reviews" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Needs approval" },
  { key: "unreplied", label: "No reply yet" },
  { key: "hidden", label: "Hidden" },
] as const;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const membership = await requirePermission("reviews.view");
  if (!membership) return <PermissionDenied />;
  const { filter: rawFilter } = await searchParams;
  const filter = FILTERS.find((item) => item.key === rawFilter)?.key ?? "all";

  const orgUnits = await listOrgUnits(membership.organizationId);
  const [rows, summaries, pendingCount, hiddenRows] = await Promise.all([
    listOrgReviews(membership.organizationId, {
      status:
        filter === "pending"
          ? "pending"
          : filter === "hidden"
            ? "hidden"
            : undefined,
      unreplied: filter === "unreplied",
    }),
    getReviewSummaries(
      membership.organizationId,
      orgUnits.map((unit) => unit.id),
    ),
    countPendingReviews(membership.organizationId),
    listOrgReviews(membership.organizationId, { status: "hidden" }),
  ]);
  const hiddenAny = hiddenRows.length > 0;

  // Stays a pending open-link review could belong to, per unit.
  const pendingUnits = [
    ...new Set(
      rows
        .filter((row) => row.status === "pending" && row.kind === "community")
        .map((row) => row.unitId),
    ),
  ];
  const stayEntries = await Promise.all(
    pendingUnits.map(
      async (unitId) =>
        [
          unitId,
          await listMatchableStays(membership.organizationId, unitId),
        ] as const,
    ),
  );
  const staysByUnit = new Map(stayEntries);

  const cards: ReviewCardData[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    rating: row.rating,
    body: row.body,
    privateFeedback: row.privateFeedback,
    guestName: row.guestName,
    unitName: row.unitName,
    propertyName: row.propertyName,
    submittedAt: row.submittedAt.toISOString(),
    hostReply: row.hostReply,
    matchable:
      row.kind === "community" && row.status === "pending"
        ? (staysByUnit.get(row.unitId) ?? []).map((stay) => ({
            reservationId: stay.reservationId,
            label: `${stay.guestName} · ${stay.checkInDate} → ${stay.checkOutDate}`,
          }))
        : [],
  }));

  const { overall } = summaries;
  const canUpdate = can(membership, "reviews.update");
  const hasRating = overall.score.displayRating !== null;
  const hasAny = overall.score.count > 0 || pendingCount > 0 || hiddenAny;

  const stats = [
    {
      label: "Rating",
      value: hasRating ? formatRating(overall.score.displayRating!) : "–",
      note: hasRating
        ? "out of 5"
        : `Shown once a unit has ${MIN_VERIFIED_FOR_SCORE} verified reviews`,
    },
    {
      label: "Published reviews",
      value: String(overall.score.count),
      note: `${overall.score.verifiedCount} verified`,
    },
    {
      label: "Needs approval",
      value: String(pendingCount),
      note: pendingCount > 0 ? "Open-link reviews waiting" : "All caught up",
      highlight: pendingCount > 0,
      href: pendingCount > 0 ? "/reviews?filter=pending" : undefined,
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <PageHeading
        title="Reviews"
        description="What guests said about your units, across every property."
      />

      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const body = (
            <>
              <dt className="text-sm text-ink/60">{stat.label}</dt>
              <dd
                className={`mt-1 font-display text-3xl ${
                  stat.highlight ? "text-clay-deep" : "text-pine"
                }`}
              >
                {stat.value}
              </dd>
              <dd className="mt-0.5 text-xs text-ink/55">{stat.note}</dd>
            </>
          );
          return (
            <Card
              key={stat.label}
              className={`bg-card ${stat.highlight ? "border-clay/30" : ""}`}
            >
              {stat.href ? (
                <Link
                  href={stat.href}
                  className="block px-5 py-4 hover:bg-clay-mist/40"
                >
                  {body}
                </Link>
              ) : (
                <div className="px-5 py-4">{body}</div>
              )}
            </Card>
          );
        })}
      </dl>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-pine">All reviews</h2>
          <InfoTip>
            Verified reviews come from guests who stayed, through the review
            link on a checked-out reservation. Open-link reviews are written on
            your public unit page; they wait for your approval and count for
            much less, so a few of them can&apos;t change your rating.
          </InfoTip>
        </div>
        <TabBar
          label="Review filters"
          current={filter}
          className="mb-4 mt-3"
          items={FILTERS.map((item) => ({
            key: item.key,
            label: item.label,
            href:
              item.key === "all" ? "/reviews" : `/reviews?filter=${item.key}`,
          }))}
        />

        <Card className="overflow-hidden bg-card">
          {cards.length === 0 ? (
            hasAny && filter !== "all" ? (
              <EmptyState
                title="Nothing here"
                description="No reviews match this filter."
              />
            ) : (
              <EmptyState
                art="reviews"
                title="No reviews yet"
                description="After a guest checks out, open their reservation and share the review link. Reviews show up here as they come in."
                action={
                  <Link
                    href="/reservations"
                    className={buttonClassName("primary", "md")}
                  >
                    Go to reservations
                  </Link>
                }
              />
            )
          ) : (
            <div className="divide-y divide-pine/10">
              {cards.map((card) => (
                <ReviewCard key={card.id} review={card} canUpdate={canUpdate} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

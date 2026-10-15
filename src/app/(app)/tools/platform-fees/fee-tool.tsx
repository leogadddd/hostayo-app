"use client";

import { useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { comparePlatforms, DEFAULT_PLATFORMS } from "@/lib/tool-calcs";
import { cn } from "@/lib/utils";
import {
  EmptyResults,
  NumberField,
  parse,
  pesos,
  ResultsCard,
  Section,
  ToolLayout,
  useFields,
} from "../tool-kit";

export function FeeTool() {
  const { draft, set, num } = useFields({
    rate: "",
    nights: "2",
    cleaning: "",
    bookings: "10",
  });
  const [fees, setFees] = useState(
    DEFAULT_PLATFORMS.map((platform) => String(platform.feePercent)),
  );
  const rows = comparePlatforms({
    nightlyRate: num("rate"),
    nights: num("nights") || 1,
    cleaningFee: num("cleaning"),
    platforms: DEFAULT_PLATFORMS.map((platform, index) => ({
      name: platform.name,
      feePercent: Math.min(parse(fees[index] ?? ""), 99),
    })),
  });
  const bookings = num("bookings");
  const best = Math.min(...rows.map((row) => row.behindBest));
  const worst = Math.max(...rows.map((row) => row.behindBest));

  return (
    <ToolLayout
      inputs={
        <>
          <Section
            title="A typical booking"
            info="Fill in what a booking usually looks like. Every platform is compared on the same booking."
          >
            <NumberField
              id="fee-rate"
              label="Nightly rate"
              unit="₱"
              value={draft.rate}
              onChange={set("rate")}
              placeholder="e.g. 3,500"
            />
            <NumberField
              id="fee-nights"
              label="Nights"
              unit="nights"
              value={draft.nights}
              onChange={set("nights")}
            />
            <NumberField
              id="fee-cleaning"
              label="Cleaning fee"
              unit="₱"
              value={draft.cleaning}
              onChange={set("cleaning")}
            />
            <NumberField
              id="fee-bookings"
              label="Bookings a month"
              info="Used to show the difference per month."
              unit="bookings"
              value={draft.bookings}
              onChange={set("bookings")}
            />
          </Section>
          <Card className="bg-card">
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg text-pine">
                  What each platform takes
                </h2>
                <InfoTip>
                  Starting points only. Platforms change their fees and some
                  charge guests a separate service fee, so check your own payout
                  statements and edit these.
                </InfoTip>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {DEFAULT_PLATFORMS.map((platform, index) => (
                  <div key={platform.name}>
                    <label
                      htmlFor={`fee-${index}`}
                      className="mb-1.5 block text-sm font-medium text-ink"
                    >
                      {platform.name}
                    </label>
                    <div className="relative">
                      <Input
                        id={`fee-${index}`}
                        inputMode="decimal"
                        value={fees[index]}
                        onChange={(event) =>
                          setFees((current) =>
                            current.map((fee, at) =>
                              at === index ? event.target.value : fee,
                            ),
                          )
                        }
                        className="pr-8"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/45">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      }
      results={
        <ResultsCard title="What you keep">
          {num("rate") <= 0 ? (
            <EmptyResults>
              Enter a nightly rate to compare the platforms.
            </EmptyResults>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink/60">A booking costs the guest</p>
                <p className="mt-1 font-display text-4xl text-pine">
                  {pesos(rows[0]!.guestPays)}
                </p>
              </div>
              <ul className="divide-y divide-pine/10 border-y border-pine/10">
                {rows.map((row) => (
                  <li key={row.name} className="py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-ink">
                        {row.name}
                      </span>
                      <span className="font-semibold tabular-nums text-pine">
                        {pesos(row.youKeep)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 flex justify-between gap-3 text-sm text-ink/55",
                      )}
                    >
                      <span>Fee {pesos(row.fee)}</span>
                      {row.behindBest > 0.5 ? (
                        <span>
                          {pesos(row.behindBest)} less · charge{" "}
                          {pesos(row.priceToMatchBest)} to match
                        </span>
                      ) : (
                        <span>Best of these</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {bookings > 0 && worst > best ? (
                <p className="text-sm text-ink/70">
                  Over {bookings} bookings a month, the cheapest channel keeps
                  you up to{" "}
                  <span className="font-semibold text-pine">
                    {pesos((worst - best) * bookings)}
                  </span>{" "}
                  more than the most expensive one.
                </p>
              ) : null}
            </>
          )}
        </ResultsCard>
      }
    />
  );
}

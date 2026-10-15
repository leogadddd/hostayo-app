"use client";

import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { MONTHS, suggestSeasons, type SeasonLabel } from "@/lib/tool-calcs";
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

const LABELS: Record<
  SeasonLabel,
  { text: string; tone: "clay" | "neutral" | "sage" }
> = {
  peak: { text: "Peak", tone: "clay" },
  high: { text: "Busy", tone: "clay" },
  steady: { text: "Steady", tone: "neutral" },
  slow: { text: "Slow", tone: "sage" },
};

const MONTH_FIELDS = MONTHS.map((_, index) => `m${index}`);

export function SeasonalTool() {
  const { draft, set, num } = useFields({
    base: "",
    target: "70",
    ...Object.fromEntries(MONTH_FIELDS.map((key) => [key, ""])),
  } as Record<string, string>);

  const entered = MONTH_FIELDS.filter((key) => draft[key]!.trim() !== "");
  const plan = suggestSeasons({
    baseRate: num("base"),
    targetOccupancy: num("target"),
    occupancyByMonth: MONTH_FIELDS.map((key) =>
      Math.min(parse(draft[key]!), 100),
    ),
  });
  const visible = plan.filter(
    (_, index) => draft[MONTH_FIELDS[index]!]!.trim() !== "",
  );
  const group = (label: SeasonLabel) =>
    visible
      .filter((month) => month.label === label)
      .map((month) => month.month.slice(0, 3));

  return (
    <ToolLayout
      inputs={
        <>
          <Section title="Your rate and goal">
            <NumberField
              id="season-base"
              label="Your usual nightly rate"
              unit="₱"
              value={draft.base!}
              onChange={set("base")}
              placeholder="e.g. 3,500"
            />
            <NumberField
              id="season-target"
              label="Occupancy you'd be happy with"
              info="Months that fill beyond this can charge more; months that stay below it may need a lower price to get booked."
              unit="%"
              value={draft.target!}
              onChange={set("target")}
            />
          </Section>
          <Section
            title="How full each month was"
            info="Use last year's occupancy, or your best guess. Leave out months you don't have numbers for."
          >
            {MONTHS.map((month, index) => (
              <NumberField
                key={month}
                id={`season-${index}`}
                label={month}
                unit="%"
                value={draft[MONTH_FIELDS[index]!]!}
                onChange={set(MONTH_FIELDS[index]!)}
              />
            ))}
          </Section>
        </>
      }
      results={
        <ResultsCard title="Suggested rates">
          {num("base") <= 0 || entered.length === 0 ? (
            <EmptyResults>
              Enter your usual rate and the occupancy for a few months to see
              which ones to raise or lower.
            </EmptyResults>
          ) : (
            <>
              <ul className="divide-y divide-pine/10 border-y border-pine/10">
                {visible.map((month) => (
                  <li
                    key={month.month}
                    className="flex items-center gap-3 py-2 text-sm"
                  >
                    <span className="w-24 shrink-0 font-medium text-ink">
                      {month.month}
                    </span>
                    <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-pine-mist">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-pine/60"
                        style={{ width: `${month.occupancyPercent}%` }}
                      />
                    </span>
                    <span className="w-10 text-right tabular-nums text-ink/60">
                      {month.occupancyPercent}%
                    </span>
                    <Badge
                      tone={LABELS[month.label].tone}
                      className="w-16 justify-center"
                    >
                      {LABELS[month.label].text}
                    </Badge>
                    <span className="w-24 text-right font-semibold tabular-nums text-pine">
                      {pesos(month.rate)}
                    </span>
                    <span className="w-12 text-right text-xs tabular-nums text-ink/50">
                      {month.adjustmentPercent > 0
                        ? "+"
                        : month.adjustmentPercent < 0
                          ? "−"
                          : ""}
                      {Math.abs(month.adjustmentPercent)}%
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 text-sm text-ink/70">
                {(["peak", "high", "slow"] as const).map((label) =>
                  group(label).length ? (
                    <p key={label}>
                      <span className="font-medium text-ink">
                        {LABELS[label].text}:
                      </span>{" "}
                      {group(label).join(", ")}
                    </p>
                  ) : null,
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-ink/60">
                Turn these into pricing rules
                <InfoTip>
                  Each Peak, Busy or Slow month can become a date-range rule on
                  the Pricing page, repeating every year, so the rates apply on
                  their own.
                </InfoTip>
              </div>
            </>
          )}
        </ResultsCard>
      }
    />
  );
}

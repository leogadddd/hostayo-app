"use client";

import { useMemo, useState } from "react";
import { InfoTip } from "@/components/ui/info-tip";
import {
  DEFAULT_INPUTS,
  occupancyFor,
  positionAt,
  rateFor,
  tidyRate,
  weekdayWeekendRates,
  type CalculatorInputs,
} from "@/lib/pricing-calculator";
import {
  EmptyResults,
  NumberField,
  parse,
  pesos,
  ResultsCard,
  Row,
  Section,
  ToolLayout,
} from "../tool-kit";

type Field = keyof CalculatorInputs;

/** What the form holds: strings as typed, so a half-typed number isn't rewritten. */
type Draft = Record<Field, string>;

const START: Draft = Object.fromEntries(
  Object.entries(DEFAULT_INPUTS).map(([key, value]) => [
    key,
    value === 0 ? "" : String(value),
  ]),
) as Draft;

const SCENARIOS = [40, 50, 60, 70, 80, 90];

export function PricingCalculator() {
  const [draft, setDraft] = useState<Draft>(START);
  const set = (field: Field) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const inputs = useMemo<CalculatorInputs>(() => {
    const read = (field: Field) => parse(draft[field]);
    return {
      fixedMonthly: read("fixedMonthly"),
      costPerStay: read("costPerStay"),
      cleaningFeeCharged: read("cleaningFeeCharged"),
      feePercent: Math.min(read("feePercent"), 99),
      avgStayNights: read("avgStayNights") || 1,
      occupancyPercent: Math.min(read("occupancyPercent"), 100),
      targetProfit: read("targetProfit"),
      weekendUpliftPercent: read("weekendUpliftPercent"),
      currentRate: read("currentRate"),
      daysInMonth: Math.min(read("daysInMonth") || 30, 31),
    };
  }, [draft]);

  const ready =
    inputs.fixedMonthly > 0 ||
    inputs.targetProfit > 0 ||
    inputs.costPerStay > 0;
  const breakEven = rateFor(inputs, 0);
  const recommendedRaw = rateFor(inputs, inputs.targetProfit);
  const recommended = recommendedRaw === null ? null : tidyRate(recommendedRaw);
  const split =
    recommended === null
      ? null
      : weekdayWeekendRates(recommended, inputs.weekendUpliftPercent);
  const atRecommended =
    recommended === null ? null : positionAt(inputs, recommended);
  const atCurrent =
    inputs.currentRate > 0 ? positionAt(inputs, inputs.currentRate) : null;
  const breakEvenOccupancy =
    recommended === null ? null : occupancyFor(inputs, recommended);
  const currentBreakEven =
    inputs.currentRate > 0 ? occupancyFor(inputs, inputs.currentRate) : null;

  return (
    <ToolLayout
      inputs={
        <>
          <Section
            title="What the unit costs you"
            info="Money you spend whether or not anyone stays: rent or amortization, association dues, electricity and water, internet, insurance, subscriptions. Use a typical month."
          >
            <NumberField
              id="calc-fixed"
              label="Fixed costs per month"
              unit="₱"
              value={draft.fixedMonthly}
              onChange={set("fixedMonthly")}
              placeholder="e.g. 30,000"
            />
            <NumberField
              id="calc-per-stay"
              label="Your cost per stay"
              info="What you pay each time guests leave: cleaner, laundry, toiletries, welcome items."
              unit="₱"
              value={draft.costPerStay}
              onChange={set("costPerStay")}
              placeholder="e.g. 500"
            />
            <NumberField
              id="calc-fees"
              label="Platform and payment fees"
              info="A blended percentage of what guests pay. Airbnb is around 3% for hosts; Booking.com takes more; direct bookings cost close to nothing."
              unit="%"
              value={draft.feePercent}
              onChange={set("feePercent")}
            />
          </Section>

          <Section
            title="How it gets booked"
            info="Be honest here. Look at your calendar for a typical month rather than your best one."
          >
            <NumberField
              id="calc-occupancy"
              label="Expected occupancy"
              info="Share of the month's nights that get booked."
              unit="%"
              value={draft.occupancyPercent}
              onChange={set("occupancyPercent")}
            />
            <NumberField
              id="calc-stay"
              label="Average stay"
              info="Nights per booking. Longer stays mean fewer cleanings."
              unit="nights"
              value={draft.avgStayNights}
              onChange={set("avgStayNights")}
            />
            <NumberField
              id="calc-days"
              label="Days in the month"
              unit="days"
              value={draft.daysInMonth}
              onChange={set("daysInMonth")}
            />
          </Section>

          <Section title="What you want">
            <NumberField
              id="calc-profit"
              label="Profit per month"
              info="What's left for you after every cost above."
              unit="₱"
              value={draft.targetProfit}
              onChange={set("targetProfit")}
              placeholder="e.g. 15,000"
            />
            <NumberField
              id="calc-cleaning"
              label="Cleaning fee you charge guests"
              info="Charged once per stay on top of the nightly rate. It helps cover your cost per stay."
              unit="₱"
              value={draft.cleaningFeeCharged}
              onChange={set("cleaningFeeCharged")}
              placeholder="e.g. 400"
            />
            <NumberField
              id="calc-weekend"
              label="Weekend uplift"
              info="Extra charged on Friday and Saturday nights. The weekday and weekend rates below still average out to the recommended rate."
              unit="%"
              value={draft.weekendUpliftPercent}
              onChange={set("weekendUpliftPercent")}
            />
            <NumberField
              id="calc-current"
              label="Your current nightly rate"
              info="Optional. Shows how it compares."
              unit="₱"
              value={draft.currentRate}
              onChange={set("currentRate")}
            />
          </Section>
        </>
      }
      results={
        <ResultsCard title="Your rate">
          {!ready ? (
            <EmptyResults>
              Enter your monthly costs or the profit you want, and the rate that
              gets you there appears here.
            </EmptyResults>
          ) : recommended === null || !split || !atRecommended ? (
            <EmptyResults>
              Set an occupancy above 0% to work out a rate.
            </EmptyResults>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink/60">Recommended nightly rate</p>
                <p className="mt-1 font-display text-4xl text-pine">
                  {pesos(recommended)}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  Weekdays {pesos(tidyRate(split.weekday))} · Fri and Sat{" "}
                  {pesos(tidyRate(split.weekend))}
                </p>
              </div>

              <dl className="divide-y divide-pine/10 border-y border-pine/10">
                <Row
                  label="Break-even rate"
                  value={breakEven === null ? "—" : pesos(breakEven)}
                />
                <Row
                  label="Occupancy needed to break even"
                  value={
                    breakEvenOccupancy === null
                      ? "—"
                      : `${Math.round(breakEvenOccupancy)}%`
                  }
                  tone={
                    breakEvenOccupancy !== null && breakEvenOccupancy > 100
                      ? "bad"
                      : undefined
                  }
                />
              </dl>

              <div>
                <h3 className="mb-1 text-sm font-medium text-ink">
                  A month at {pesos(recommended)} and {inputs.occupancyPercent}%
                </h3>
                <dl className="divide-y divide-pine/10">
                  <Row
                    label="Nights booked"
                    value={`${Math.round(atRecommended.bookedNights * 10) / 10}`}
                  />
                  <Row
                    label="Guests pay"
                    value={pesos(atRecommended.revenue)}
                  />
                  <Row
                    label="Platform fees"
                    value={`−${pesos(atRecommended.fees)}`}
                  />
                  <Row
                    label="Your costs"
                    value={`−${pesos(atRecommended.costs)}`}
                  />
                  <Row
                    label="Profit"
                    value={pesos(atRecommended.profit)}
                    strong
                    tone={atRecommended.profit >= 0 ? "good" : "bad"}
                  />
                </dl>
              </div>

              {atCurrent ? (
                <div className="rounded-lg bg-pine-mist/60 p-3">
                  <h3 className="mb-1 text-sm font-medium text-ink">
                    At your current {pesos(inputs.currentRate)}
                  </h3>
                  <dl>
                    <Row
                      label="Profit per month"
                      value={pesos(atCurrent.profit)}
                      strong
                      tone={atCurrent.profit >= 0 ? "good" : "bad"}
                    />
                    <Row
                      label="Occupancy to break even"
                      value={
                        currentBreakEven === null
                          ? "Can't cover costs"
                          : `${Math.round(currentBreakEven)}%`
                      }
                    />
                  </dl>
                </div>
              ) : null}

              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
                  Rate you&apos;d need at other occupancies
                  <InfoTip>
                    The nightly rate that still earns your target profit if
                    bookings come in higher or lower than expected.
                  </InfoTip>
                </h3>
                <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                  {SCENARIOS.map((occupancy) => {
                    const rate = rateFor(
                      inputs,
                      inputs.targetProfit,
                      occupancy,
                    );
                    return (
                      <Row
                        key={occupancy}
                        label={`${occupancy}%`}
                        value={rate === null ? "—" : pesos(tidyRate(rate))}
                        strong={
                          occupancy === Math.round(inputs.occupancyPercent)
                        }
                      />
                    );
                  })}
                </dl>
              </div>
            </>
          )}
        </ResultsCard>
      }
    />
  );
}

"use client";

import { investmentResult } from "@/lib/tool-calcs";
import {
  EmptyResults,
  NumberField,
  pesos,
  ResultsCard,
  Row,
  Section,
  ToolLayout,
  useFields,
} from "../tool-kit";

function years(months: number): string {
  if (months < 24) return `${Math.round(months)} months`;
  return `${(months / 12).toFixed(1)} years`;
}

export function InvestmentTool() {
  const { draft, set, num } = useFields({
    upfront: "",
    loan: "",
    other: "",
    rate: "",
    occupancy: "60",
    stay: "2",
    costPerStay: "",
    cleaning: "",
    fees: "3",
  });
  const result = investmentResult({
    upfrontCash: num("upfront"),
    loanMonthly: num("loan"),
    otherFixedMonthly: num("other"),
    rate: num("rate"),
    occupancyPercent: Math.min(num("occupancy"), 100),
    avgStayNights: num("stay") || 1,
    costPerStay: num("costPerStay"),
    cleaningFeeCharged: num("cleaning"),
    feePercent: Math.min(num("fees"), 99),
  });
  const ready = num("rate") > 0;

  return (
    <ToolLayout
      inputs={
        <>
          <Section title="What you put in">
            <NumberField
              id="inv-upfront"
              label="Cash invested upfront"
              info="Down payment, furniture and appliances, renovation, permits and anything else you paid out of pocket before the first guest."
              unit="₱"
              value={draft.upfront}
              onChange={set("upfront")}
              placeholder="e.g. 1,200,000"
            />
            <NumberField
              id="inv-loan"
              label="Loan payment per month"
              info="Your monthly amortization, if you financed the unit. Leave empty if you paid in cash."
              unit="₱"
              value={draft.loan}
              onChange={set("loan")}
            />
            <NumberField
              id="inv-other"
              label="Other fixed costs per month"
              info="Association dues, utilities, internet, insurance and subscriptions."
              unit="₱"
              value={draft.other}
              onChange={set("other")}
            />
          </Section>
          <Section title="What it earns">
            <NumberField
              id="inv-rate"
              label="Nightly rate"
              unit="₱"
              value={draft.rate}
              onChange={set("rate")}
            />
            <NumberField
              id="inv-occupancy"
              label="Expected occupancy"
              unit="%"
              value={draft.occupancy}
              onChange={set("occupancy")}
            />
            <NumberField
              id="inv-stay"
              label="Average stay"
              unit="nights"
              value={draft.stay}
              onChange={set("stay")}
            />
            <NumberField
              id="inv-cost"
              label="Your cost per stay"
              info="Cleaner, laundry and supplies after each stay."
              unit="₱"
              value={draft.costPerStay}
              onChange={set("costPerStay")}
            />
            <NumberField
              id="inv-cleaning"
              label="Cleaning fee charged"
              unit="₱"
              value={draft.cleaning}
              onChange={set("cleaning")}
            />
            <NumberField
              id="inv-fees"
              label="Platform and payment fees"
              unit="%"
              value={draft.fees}
              onChange={set("fees")}
            />
          </Section>
        </>
      }
      results={
        <ResultsCard title="The investment">
          {!ready ? (
            <EmptyResults>
              Enter a nightly rate and your costs to see how long the unit takes
              to pay itself back.
            </EmptyResults>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink/60">
                  Time to earn your cash back
                </p>
                <p
                  className={`mt-1 font-display text-4xl ${result.paybackMonths === null ? "text-clay-deep" : "text-pine"}`}
                >
                  {result.paybackMonths === null
                    ? num("upfront") > 0
                      ? "Not at this rate"
                      : "—"
                    : years(result.paybackMonths)}
                </p>
              </div>
              <dl className="divide-y divide-pine/10 border-y border-pine/10">
                <Row
                  label="Profit per month"
                  value={pesos(result.monthlyProfit)}
                  strong
                  tone={result.monthlyProfit >= 0 ? "good" : "bad"}
                />
                <Row
                  label="Profit per year"
                  value={pesos(result.annualProfit)}
                />
                <Row
                  label="Yearly return on your cash"
                  value={
                    result.annualReturnPercent === null
                      ? "—"
                      : `${result.annualReturnPercent.toFixed(1)}%`
                  }
                />
                <Row
                  label="Occupancy to break even"
                  value={
                    result.breakEvenOccupancy === null
                      ? "Can't cover costs"
                      : `${Math.round(result.breakEvenOccupancy)}%`
                  }
                  tone={
                    result.breakEvenOccupancy !== null &&
                    result.breakEvenOccupancy > 100
                      ? "bad"
                      : undefined
                  }
                />
              </dl>
            </>
          )}
        </ResultsCard>
      }
    />
  );
}

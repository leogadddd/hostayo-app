"use client";

import { useState } from "react";
import { Plus, Trash as Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { propertyResult } from "@/lib/tool-calcs";
import {
  EmptyResults,
  NumberField,
  parse,
  pesos,
  ResultsCard,
  Row,
  Section,
  ToolLayout,
  useFields,
} from "../tool-kit";

interface UnitDraft {
  key: number;
  name: string;
  rate: string;
  occupancy: string;
  stay: string;
  costPerStay: string;
  cleaning: string;
}

function newUnit(key: number): UnitDraft {
  return {
    key,
    name: `Unit ${key}`,
    rate: "",
    occupancy: "60",
    stay: "2",
    costPerStay: "",
    cleaning: "",
  };
}

export function PropertyTool() {
  const { draft, set, num } = useFields({
    shared: "",
    fees: "3",
    days: "30",
  });
  const [units, setUnits] = useState<UnitDraft[]>([newUnit(1), newUnit(2)]);
  const change = (key: number, field: keyof UnitDraft, value: string) =>
    setUnits((current) =>
      current.map((unit) =>
        unit.key === key ? { ...unit, [field]: value } : unit,
      ),
    );

  const result = propertyResult({
    sharedFixedMonthly: num("shared"),
    feePercent: Math.min(num("fees"), 99),
    daysInMonth: Math.min(num("days") || 30, 31),
    units: units.map((unit) => ({
      name: unit.name.trim() || "Unit",
      rate: parse(unit.rate),
      occupancyPercent: Math.min(parse(unit.occupancy), 100),
      avgStayNights: parse(unit.stay) || 1,
      costPerStay: parse(unit.costPerStay),
      cleaningFeeCharged: parse(unit.cleaning),
    })),
  });
  const ready = units.some((unit) => parse(unit.rate) > 0);

  return (
    <ToolLayout
      inputs={
        <>
          <Section
            title="Shared by the whole property"
            info="Costs that don't belong to one unit: building or association dues, a caretaker's pay, internet, security, common utilities. Use a typical month."
          >
            <NumberField
              id="prop-shared"
              label="Shared costs per month"
              unit="₱"
              value={draft.shared}
              onChange={set("shared")}
              placeholder="e.g. 40,000"
            />
            <NumberField
              id="prop-fees"
              label="Platform and payment fees"
              info="A blended percentage of what guests pay."
              unit="%"
              value={draft.fees}
              onChange={set("fees")}
            />
            <NumberField
              id="prop-days"
              label="Days in the month"
              unit="days"
              value={draft.days}
              onChange={set("days")}
            />
          </Section>

          {units.map((unit) => (
            <Card key={unit.key} className="bg-card">
              <CardBody className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`unit-name-${unit.key}`}>Unit name</Label>
                    <Input
                      id={`unit-name-${unit.key}`}
                      value={unit.name}
                      onChange={(event) =>
                        change(unit.key, "name", event.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    aria-label={`Remove ${unit.name || "unit"}`}
                    disabled={units.length === 1}
                    onClick={() =>
                      setUnits((current) =>
                        current.filter((other) => other.key !== unit.key),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    id={`unit-rate-${unit.key}`}
                    label="Nightly rate"
                    unit="₱"
                    value={unit.rate}
                    onChange={(value) => change(unit.key, "rate", value)}
                  />
                  <NumberField
                    id={`unit-occ-${unit.key}`}
                    label="Occupancy"
                    unit="%"
                    value={unit.occupancy}
                    onChange={(value) => change(unit.key, "occupancy", value)}
                  />
                  <NumberField
                    id={`unit-stay-${unit.key}`}
                    label="Average stay"
                    unit="nights"
                    value={unit.stay}
                    onChange={(value) => change(unit.key, "stay", value)}
                  />
                  <NumberField
                    id={`unit-cost-${unit.key}`}
                    label="Your cost per stay"
                    info="Cleaner, laundry and supplies after each stay."
                    unit="₱"
                    value={unit.costPerStay}
                    onChange={(value) => change(unit.key, "costPerStay", value)}
                  />
                  <NumberField
                    id={`unit-cleaning-${unit.key}`}
                    label="Cleaning fee charged"
                    unit="₱"
                    value={unit.cleaning}
                    onChange={(value) => change(unit.key, "cleaning", value)}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setUnits((current) => [
                ...current,
                newUnit(Math.max(0, ...current.map((u) => u.key)) + 1),
              ])
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add a unit
          </Button>
        </>
      }
      results={
        <ResultsCard title="The property">
          {!ready ? (
            <EmptyResults>
              Enter a nightly rate for at least one unit to see how the property
              does.
            </EmptyResults>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink/60">Profit per month</p>
                <p
                  className={`mt-1 font-display text-4xl ${result.profit >= 0 ? "text-pine" : "text-clay-deep"}`}
                >
                  {pesos(result.profit)}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {result.marginPercent === null
                    ? "—"
                    : `${Math.round(result.marginPercent)}% of ${pesos(result.revenue)} paid by guests`}
                </p>
              </div>
              <dl className="divide-y divide-pine/10 border-y border-pine/10">
                <Row
                  label="Occupancy to cover shared costs"
                  value={
                    result.breakEvenOccupancy === null
                      ? "Can't cover them"
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
              <div>
                <h3 className="mb-1 text-sm font-medium text-ink">
                  What each unit earns before shared costs
                </h3>
                <dl className="divide-y divide-pine/10">
                  {result.units.map((unit, index) => (
                    <Row
                      key={units[index]!.key}
                      label={unit.name}
                      value={pesos(unit.profitBeforeShared)}
                      tone={unit.profitBeforeShared >= 0 ? "good" : "bad"}
                    />
                  ))}
                  <Row
                    label="Shared costs"
                    value={`−${pesos(num("shared"))}`}
                  />
                </dl>
              </div>
            </>
          )}
        </ResultsCard>
      }
    />
  );
}

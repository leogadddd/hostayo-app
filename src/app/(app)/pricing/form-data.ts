import { listOrgUnits, listProperties } from "@/server/inventory/service";
import { listPricingRules } from "@/server/pricing/service";
import type { PreviewUnit } from "./price-preview";
import type { TargetProperty } from "./rule-form";

/** What the add and edit forms need: the targets to pick from, units to preview and the other rules. */
export async function loadPricingFormData(organizationId: string) {
  const [properties, units, rules] = await Promise.all([
    listProperties(organizationId),
    listOrgUnits(organizationId),
    listPricingRules(organizationId, { activeOnly: true }),
  ]);
  const targets: TargetProperty[] = properties.map((property) => ({
    id: property.id,
    name: property.name,
    units: units
      .filter((unit) => unit.propertyId === property.id)
      .map((unit) => ({ id: unit.id, name: unit.name })),
  }));
  const propertyName = new Map(properties.map((p) => [p.id, p.name]));
  const previewUnits: PreviewUnit[] = units.map((unit) => ({
    id: unit.id,
    propertyId: unit.propertyId,
    name: unit.name,
    propertyName: propertyName.get(unit.propertyId) ?? "",
    nightlyRateCents: unit.defaultNightlyRateCents,
    dayRates: unit.dayRates,
  }));
  return {
    properties: targets,
    previewUnits,
    activeRules: rules,
    timeZone: properties[0]?.timezone ?? "Asia/Manila",
  };
}

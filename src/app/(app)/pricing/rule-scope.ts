import { ruleAppliesToUnit, type PricingRuleLike } from "@/lib/pricing-rules";

/** What a rule covers, in words, and how many of the organization's units that is. */
export function ruleScope(
  rule: Pick<PricingRuleLike, "appliesToAll" | "propertyIds" | "unitIds">,
  properties: { id: string; name: string }[],
  units: { id: string; propertyId: string }[],
): { scope: string; unitCount: number } {
  const unitCount = units.filter((unit) =>
    ruleAppliesToUnit(rule, unit),
  ).length;
  if (rule.appliesToAll) return { scope: "All units", unitCount };
  const names = properties
    .filter((property) => rule.propertyIds.includes(property.id))
    .map((property) => property.name);
  const parts: string[] = [];
  if (names.length === 1) parts.push(names[0]!);
  else if (names.length > 1) parts.push(`${names.length} properties`);
  const loose = rule.unitIds.filter((id) => units.some((u) => u.id === id));
  if (loose.length)
    parts.push(`${loose.length} ${loose.length === 1 ? "unit" : "units"}`);
  return { scope: parts.join(" + ") || "No units", unitCount };
}

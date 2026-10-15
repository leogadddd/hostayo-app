import { unitOrPropertyPhotoSrc } from "@/lib/photos";
import type { Unit } from "@/lib/db/schema";
import { reservationFeeRule } from "@/lib/reservation-fee";
import type { PricingRuleLike } from "@/lib/pricing-rules";
import { ruleAppliesToUnit } from "@/lib/pricing-rules";
import type { UnitOption } from "./reservation-form";

/** A unit as the reservation form shows it. Rates are only sent to people who may see them. */
export function toUnitOption(
  unit: Unit,
  property: { id: string; name: string; imageUrl: string | null } | undefined,
  {
    multipleProperties,
    showRates,
    pricingRules = [],
  }: {
    multipleProperties: boolean;
    showRates: boolean;
    /** Active rules; only the ones that price this unit are sent to the form. */
    pricingRules?: readonly PricingRuleLike[];
  },
): UnitOption {
  return {
    id: unit.id,
    label:
      multipleProperties && property
        ? `${property.name} · ${unit.name}`
        : unit.name,
    name: unit.name,
    propertyName: property?.name ?? null,
    imageUrl: unitOrPropertyPhotoSrc(unit, property),
    capacity: unit.capacity,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    checkInTime: unit.checkInTime,
    checkOutTime: unit.checkOutTime,
    nightlyRateCents: showRates ? unit.defaultNightlyRateCents : null,
    dayRates: showRates ? unit.dayRates : null,
    pricingRules: showRates
      ? pricingRules
          .filter((rule) => ruleAppliesToUnit(rule, unit))
          // Already narrowed to this unit, so the form needn't know the targets.
          .map((rule) => ({
            ...rule,
            appliesToAll: true,
            propertyIds: [],
            unitIds: [],
          }))
      : [],
    cleaningFeeCents: showRates ? unit.cleaningFeeCents : null,
    securityDepositCents: showRates ? unit.securityDepositCents : null,
    reservationFee: showRates ? reservationFeeRule(unit) : null,
  };
}

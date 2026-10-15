import { TabBar } from "@/components/ui/tab-bar";

export interface SectionTab {
  key: string;
  label: string;
  href: string;
}

/** The pages that make up a property: details and photos. */
export function propertyTabs(propertyId: string): SectionTab[] {
  const base = `/properties/${propertyId}`;
  return [
    { key: "details", label: "Details", href: `${base}/edit` },
    { key: "photos", label: "Photos", href: `${base}/photos` },
  ];
}

/** The pages that make up a unit, in the order they're set up. */
export function unitTabs(propertyId: string, unitId: string): SectionTab[] {
  const base = `/properties/${propertyId}/units/${unitId}`;
  return [
    { key: "details", label: "Details", href: `${base}/edit` },
    { key: "pricing", label: "Pricing", href: `${base}/pricing` },
    { key: "guide", label: "Guest guide", href: `${base}/guide` },
    { key: "photos", label: "Photos", href: `${base}/photos` },
  ];
}

/**
 * Tabs across the pages of one property or unit, so editing moves between
 * Details, Pricing and the rest instead of living on one long form.
 */
export function SectionTabs({
  tabs,
  current,
}: {
  tabs: SectionTab[];
  current: string;
}) {
  return <TabBar items={tabs} current={current} />;
}

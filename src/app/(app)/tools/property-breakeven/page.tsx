import type { Metadata } from "next";
import { ToolPage } from "../tool-page";
import { PropertyTool } from "./property-tool";

export const metadata: Metadata = { title: "Property break-even" };

export default function PropertyBreakEvenPage() {
  return (
    <ToolPage
      title="Property break-even"
      description="See whether a whole property pays for itself: add each unit's rate and bookings, then the costs they share."
    >
      <PropertyTool />
    </ToolPage>
  );
}

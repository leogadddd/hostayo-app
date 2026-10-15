import type { Metadata } from "next";
import { ToolPage } from "../tool-page";
import { FeeTool } from "./fee-tool";

export const metadata: Metadata = { title: "Platform fee comparison" };

export default function PlatformFeesPage() {
  return (
    <ToolPage
      title="Platform fee comparison"
      description="See what a booking leaves you on Airbnb, Booking.com, Agoda and direct, and what you'd need to charge elsewhere to match."
    >
      <FeeTool />
    </ToolPage>
  );
}

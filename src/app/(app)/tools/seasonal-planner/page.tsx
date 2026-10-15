import type { Metadata } from "next";
import { ToolPage } from "../tool-page";
import { SeasonalTool } from "./seasonal-tool";

export const metadata: Metadata = { title: "Seasonal rate planner" };

export default function SeasonalPlannerPage() {
  return (
    <ToolPage
      title="Seasonal rate planner"
      description="Enter how full each month was and see which months to raise or lower your rate, and by how much."
    >
      <SeasonalTool />
    </ToolPage>
  );
}

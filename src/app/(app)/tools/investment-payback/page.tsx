import type { Metadata } from "next";
import { ToolPage } from "../tool-page";
import { InvestmentTool } from "./investment-tool";

export const metadata: Metadata = { title: "Investment payback" };

export default function InvestmentPaybackPage() {
  return (
    <ToolPage
      title="Investment payback"
      description="Work out how long a unit takes to pay back what you put in, and what it returns each year."
    >
      <InvestmentTool />
    </ToolPage>
  );
}

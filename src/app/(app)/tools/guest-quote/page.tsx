import type { Metadata } from "next";
import { ToolPage } from "../tool-page";
import { QuoteTool } from "./quote-tool";

export const metadata: Metadata = { title: "Guest quote" };

export default function GuestQuotePage() {
  return (
    <ToolPage
      title="Guest quote"
      description="Turn dates and rates into a message you can paste into Messenger, Viber or email."
    >
      <QuoteTool />
    </ToolPage>
  );
}

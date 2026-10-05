import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "How refunds work for Hostayo.",
};

const sections: LegalSection[] = [
  {
    title: "1. About this policy",
    content:
      "This policy explains how refunds work for Hostayo, and what Hostayo does and does not do when a refund is recorded inside the product. It sits alongside our Terms and Conditions.",
  },
  {
    title: "2. Charges for Hostayo",
    content:
      "Hostayo does not currently charge for the service. If we introduce paid plans, the price, billing period and refund terms will be shown clearly before you pay, and we will update this policy before any charge is made.",
  },
  {
    title: "3. If you are charged in error",
    content: `If you believe you were charged for Hostayo by mistake, or charged twice, contact us at ${SUPPORT_EMAIL} within 30 days with the details. We will review it promptly and refund any charge that was made in error.`,
  },
  {
    title: "4. Payments between hosts and guests",
    content:
      "Hostayo does not currently have a payment gateway. It does not collect, hold, process or transfer money between hosts and guests, and it is not involved in any transaction between them. Deposits, balances and refunds that you record in Hostayo are your own records of payments made outside the platform. Any refund owed to a guest is solely between you and that guest, under your own booking and cancellation terms.",
  },
  {
    title: "5. Refunds recorded in Hostayo",
    content:
      "When you record a refund or a deduction against a booking, Hostayo keeps it in that booking's history and in your audit log. Recording a refund does not send money to anyone. You are responsible for actually paying the refund by whatever method you and your guest agreed on.",
  },
  {
    title: "6. Changes to this policy",
    content:
      "We may update this policy from time to time. If we make a material change, we will update the effective date and provide notice through Hostayo or another reasonable channel.",
  },
  {
    title: "7. Contact",
    content: `For questions about this policy, contact the Hostayo team at ${SUPPORT_EMAIL}.`,
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="How refunds work for Hostayo, and what happens when a refund is recorded inside the product."
      effectiveDate="October 4, 2026"
      sections={sections}
    />
  );
}

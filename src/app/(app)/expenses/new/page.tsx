import type { Metadata } from "next";
import { RoutePage } from "@/components/app/route-page";
import { newExpensePanel } from "../expense-panels";

export const metadata: Metadata = { title: "Record expense" };

export default async function NewExpensePage() {
  const { body, ...panel } = await newExpensePanel();
  return (
    <RoutePage {...panel} backHref="/expenses" backLabel="Back to expenses">
      {body}
    </RoutePage>
  );
}

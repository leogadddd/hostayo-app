import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoutePage } from "@/components/app/route-page";
import { expensePanel } from "../expense-panels";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const { body, missing, ...panel } = await expensePanel(expenseId);
  if (missing) notFound();
  return (
    <RoutePage {...panel} backHref="/expenses" backLabel="Back to expenses">
      {body}
    </RoutePage>
  );
}

import { redirect } from "next/navigation";
import { registrationDisabled } from "@/lib/flags";

// Read the flag per request so toggling the env var needs no rebuild.
export const dynamic = "force-dynamic";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (registrationDisabled()) redirect("/login");
  return children;
}

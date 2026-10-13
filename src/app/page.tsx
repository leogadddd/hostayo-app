import { redirect } from "next/navigation";
import { getSession, hasOrganizationAccess } from "@/lib/auth/session";
import { HomeRedirect } from "./home-redirect";

// A real HTTP redirect in production, so crawlers and link checkers see a 307 instead of
// an empty page. Development keeps the client hop (see HomeRedirect) to dodge a dev-only bug.
const go = (href: "/login" | "/onboarding" | "/dashboard") =>
  process.env.NODE_ENV === "production" ? redirect(href) : <HomeRedirect href={href} />;

export default async function Home() {
  const session = await getSession();
  if (!session) return go("/login");
  if (!(await hasOrganizationAccess(session.user.id))) return go("/onboarding");
  return go("/dashboard");
}

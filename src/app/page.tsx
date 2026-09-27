import { getSession, hasOrganizationAccess } from "@/lib/auth/session";
import { HomeRedirect } from "./home-redirect";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    return <HomeRedirect href="/login" />;
  }
  if (!(await hasOrganizationAccess(session.user.id))) {
    return <HomeRedirect href="/onboarding" />;
  }
  return <HomeRedirect href="/dashboard" />;
}

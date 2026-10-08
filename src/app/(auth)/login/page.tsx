import LoginPage from "./login-content";
import { registrationDisabled } from "@/lib/flags";

// Read the flag per request so toggling the env var needs no rebuild.
export const dynamic = "force-dynamic";

export default function Page() {
  return <LoginPage registrationOpen={!registrationDisabled()} />;
}

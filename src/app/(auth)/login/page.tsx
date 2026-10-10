import LoginPage from "./login-content";
import { registrationDisabled, registrationInviteOnly } from "@/lib/flags";

// Read the flags per request so toggling the env vars needs no rebuild.
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <LoginPage
      registration={
        registrationDisabled()
          ? "closed"
          : registrationInviteOnly()
            ? "invite-only"
            : "open"
      }
    />
  );
}

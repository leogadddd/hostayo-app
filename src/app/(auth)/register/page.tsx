import { registrationInviteOnly } from "@/lib/flags";
import {
  inspectRegistrationInvite,
  type RegistrationInviteStatus,
} from "@/server/registration/service";
import { InviteOnlyNotice } from "./invite-only-notice";
import { RegisterForm } from "./register-form";

function first(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single?.trim() || null;
}

/**
 * /register. Open sign-up shows the form. While sign-up is invite-only
 * (REGISTRATION_INVITE_ONLY) the form is shown only to someone holding an
 * early-access link that still works (`?tk=`) or a team invitation
 * (`?invite=`, checked against their email when they submit). This page only
 * decides what to show: the auth API enforces the rule (`admitSignUp`).
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    tk?: string | string[];
    invite?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const invite = first(params.invite);
  if (!registrationInviteOnly())
    return <RegisterForm invite={invite} registrationToken={null} />;

  const token = first(params.tk);
  let status: RegistrationInviteStatus | "missing" | "unavailable" = "missing";
  if (token) {
    try {
      status = await inspectRegistrationInvite(token);
    } catch (error) {
      console.error("[register] could not check the invite link", error);
      status = "unavailable";
    }
    if (status === "valid")
      return <RegisterForm invite={invite} registrationToken={token} />;
  }
  if (invite) return <RegisterForm invite={invite} registrationToken={null} />;
  return <InviteOnlyNotice status={status} />;
}

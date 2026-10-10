/**
 * How the register form tells the auth API what lets this person sign up
 * while registration is invite-only. Sent as request headers because the
 * sign-up body only accepts account fields.
 */
export const REGISTRATION_TOKEN_HEADER = "x-hostayo-registration-token";
export const TEAM_INVITATION_HEADER = "x-hostayo-team-invitation";

/** Rejection codes from the sign-up gate (`admitSignUp`). */
export const REGISTRATION_REJECTIONS = {
  inviteRequired: "REGISTRATION_INVITE_REQUIRED",
  inviteLinkInvalid: "REGISTRATION_INVITE_LINK_INVALID",
  teamInvitationInvalid: "REGISTRATION_TEAM_INVITATION_INVALID",
} as const;

export type RegistrationRejection =
  (typeof REGISTRATION_REJECTIONS)[keyof typeof REGISTRATION_REJECTIONS];

export function isRegistrationRejection(
  code: unknown,
): code is RegistrationRejection {
  return (Object.values(REGISTRATION_REJECTIONS) as unknown[]).includes(code);
}

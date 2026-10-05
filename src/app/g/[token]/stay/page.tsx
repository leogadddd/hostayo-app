import { redirect } from "next/navigation";

/** The guest experience now lives at one canonical, shareable URL. */
export default async function LegacyGuestStayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/g/${encodeURIComponent(token)}`);
}

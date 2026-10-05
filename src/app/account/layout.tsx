/**
 * Focused account flows (e.g. two-factor setup): full screen, without the
 * app sidebar and header. Each page draws its own chrome.
 */
export default function AccountFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-paper">{children}</div>;
}

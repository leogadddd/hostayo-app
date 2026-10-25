import { AppHeader, AppSidebar } from "@/components/app/sidebar";
import { MobileTabBar } from "@/components/app/mobile-tab-bar";
import { ViewportSync } from "@/components/app/viewport-sync";
import { getAppIdentity } from "@/lib/app-identity";
import { getDeviceClass } from "@/lib/device";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [identity, device] = await Promise.all([
    getAppIdentity(),
    getDeviceClass(),
  ]);
  return (
    <div className="flex h-dvh overflow-hidden bg-paper">
      <a
        href="#main-content"
        className="fixed left-4 top-2 z-50 -translate-y-24 rounded-lg bg-clay px-4 py-3 text-sm text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <ViewportSync rendered={device} />
      <AppSidebar {...identity} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader {...identity} initialNow={new Date().toISOString()} />
        <main
          id="main-content"
          tabIndex={-1}
          // Sticky bars inside this scroller stick inside its padding; this is how far
          // to pull them back so they sit flush on the tab bar.
          className="app-scroll relative min-h-0 flex-1 overflow-y-auto px-4 py-5 [--sticky-bottom:-1.25rem] sm:px-6 sm:py-6 sm:[--sticky-bottom:-1.5rem] lg:px-8 lg:py-8 lg:[--sticky-bottom:0px]"
        >
          {children}
        </main>
        <MobileTabBar role={identity.role} permissions={identity.permissions} />
      </div>
    </div>
  );
}

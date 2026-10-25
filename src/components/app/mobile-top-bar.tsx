import type { ReactNode } from "react";
import { getAppIdentity } from "@/lib/app-identity";
import { MobileSearch } from "@/components/app/mobile-search";

export type MobileSearchProps = React.ComponentProps<typeof MobileSearch>;

/** What search needs on a phone page. Load it in the page and pass it to `MobileTopBar`. */
export async function getMobileSearchProps(): Promise<MobileSearchProps> {
  const identity = await getAppIdentity();
  return {
    organizationId: identity.organizationId,
    userEmail: identity.userEmail,
    role: identity.role,
    permissions: identity.permissions,
    l1: identity.l1,
  };
}

/**
 * The title bar of a phone page, which replaces the desktop header. It stays
 * in view while the page scrolls and carries search on its right.
 */
export function MobileTopBar({
  title,
  eyebrow,
  search,
  children,
}: {
  title: string;
  eyebrow?: string;
  search: MobileSearchProps;
  /** Extra actions beside search. */
  children?: ReactNode;
}) {
  return (
    <div className="sticky -top-5 z-10 -mx-4 -mt-5 mb-2 flex items-center gap-3 bg-paper/90 px-4 pb-3 pt-5 backdrop-blur sm:-top-6 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="truncate text-xs font-medium text-ink/55">{eyebrow}</p>
        ) : null}
        <h1 className="truncate font-display text-2xl leading-tight tracking-tight text-pine">
          {title}
        </h1>
      </div>
      {children}
      <MobileSearch {...search} />
    </div>
  );
}

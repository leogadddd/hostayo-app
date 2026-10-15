/**
 * Which sidebar groups the member opened or closed lives in a cookie, so the
 * server renders the sidebar already in that state instead of flashing the
 * defaults until the browser has read its own storage.
 */
export const SIDEBAR_GROUPS_COOKIE = "hostayo_sidebar_groups";

/** "money:0,tools:1" as a map of group id to open. */
export function parseOpenGroups(
  value: string | undefined,
): Record<string, boolean> {
  const groups: Record<string, boolean> = {};
  for (const part of (value ?? "").split(",")) {
    const [id, state] = part.split(":");
    if (id && (state === "0" || state === "1")) groups[id] = state === "1";
  }
  return groups;
}

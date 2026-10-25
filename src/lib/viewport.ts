/** Where the app switches from the phone layout to the desktop one (Tailwind `lg`). */
export const DESKTOP_MIN_WIDTH = 1024;

/**
 * The viewport the browser last reported, so the server can render the right
 * layout for a page instead of shipping both. A session cookie (no expiry):
 * it only records the window width, not a preference.
 */
export const VIEWPORT_COOKIE = "hostayo-viewport";

export type DeviceClass = "mobile" | "desktop";

export function parseDeviceClass(
  value: string | undefined | null,
): DeviceClass | null {
  return value === "mobile" || value === "desktop" ? value : null;
}

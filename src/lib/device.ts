import { cookies, headers } from "next/headers";
import {
  VIEWPORT_COOKIE,
  parseDeviceClass,
  type DeviceClass,
} from "@/lib/viewport";

/**
 * Which layout to render. The reported viewport wins; before the browser has
 * reported one (a first visit) it falls back to the mobile client hint, then
 * the user agent. `ViewportSync` corrects a wrong guess right after load.
 */
export async function getDeviceClass(): Promise<DeviceClass> {
  const reported = parseDeviceClass(
    (await cookies()).get(VIEWPORT_COOKIE)?.value,
  );
  if (reported) return reported;
  const requestHeaders = await headers();
  const hint = requestHeaders.get("sec-ch-ua-mobile");
  if (hint) return hint === "?1" ? "mobile" : "desktop";
  return /Mobi|Android|iPhone|iPod/i.test(
    requestHeaders.get("user-agent") ?? "",
  )
    ? "mobile"
    : "desktop";
}

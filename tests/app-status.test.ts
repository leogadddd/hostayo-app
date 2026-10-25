import { describe, expect, it } from "vitest";
import {
  appStatus,
  appStatusHint,
  type ConnectionState,
} from "@/lib/app-status";

const connected: ConnectionState = { online: true, pending: 0, syncing: false };

describe("appStatus", () => {
  it("is live by default and paused when the public page is off", () => {
    expect(appStatus(true, connected)).toBe("live");
    expect(appStatus(false, connected)).toBe("paused");
  });

  it("is offline whenever the connection is down, whatever else is going on", () => {
    const down = { online: false, pending: 3, syncing: true };
    expect(appStatus(true, down)).toBe("offline");
    expect(appStatus(false, down)).toBe("offline");
  });

  it("is syncing while changes are pending or being sent", () => {
    expect(appStatus(true, { ...connected, pending: 2 })).toBe("syncing");
    expect(appStatus(false, { ...connected, syncing: true })).toBe("syncing");
  });

  it("goes back to the public page state once everything is sent", () => {
    expect(appStatus(true, { online: true, pending: 0, syncing: false })).toBe(
      "live",
    );
  });
});

describe("appStatusHint", () => {
  it("counts queued changes while offline", () => {
    const connection = { online: false, pending: 1, syncing: false };
    expect(appStatusHint("offline", connection)).toContain("1 change will");
    expect(appStatusHint("offline", { ...connection, pending: 4 })).toContain(
      "4 changes will",
    );
  });
});

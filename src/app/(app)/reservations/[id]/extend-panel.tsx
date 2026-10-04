import type { ReactNode } from "react";
import { can, type Permission, type RoleKey } from "@/lib/permissions";
import { approvalBlockedReason, getExtensionState, type ExtensionState } from "@/server/reservations/extensions";
import { loadActionReservation } from "./action-page";
import { ExtendStayForm } from "./extend-stay-form";
import { ReviewExtensionForm } from "./review-extension-form";

type Member = { organizationId: string; role: RoleKey; permissions?: readonly Permission[] };
type Panel = { title: string; description: string; unavailable?: string; form?: ReactNode };

const HOUR_MS = 3_600_000;

function limitNote(state: ExtensionState) {
  const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: state.timezone });
  const turnover = state.turnoverMinutes % 60 === 0 ? `${state.turnoverMinutes / 60}h` : `${state.turnoverMinutes} min`;
  if (state.window.limitedBy === "next_arrival" && state.nextArrival) return `${state.nextArrival.label} at ${time.format(state.nextArrival.at)}; turnover takes ${turnover}.`;
  if (state.window.limitedBy === "unit_limit") return `This unit allows up to ${state.maxHours} extra hours per stay.`;
  return "Late check-out ends by midnight. For another night, edit the reservation.";
}

/**
 * Requesting late check-out: the same rules render as a full page on direct
 * visits and as a modal over the reservation. Call after the extensions.create guard.
 */
export async function requestPanel(membership: Member, id: string): Promise<Panel> {
  const { guest, unit } = await loadActionReservation(membership.organizationId, id);
  const state = await getExtensionState(membership.organizationId, id);
  const base = { title: "Request late check-out", description: `${guest.name} · ${unit.name}. Log what the guest asked for; it takes effect once approved.` };
  if (state.requestBlockedReason) return { ...base, unavailable: state.requestBlockedReason };
  return {
    ...base,
    form: (
      <ExtendStayForm
        reservationId={id}
        availableHours={state.window.availableHours}
        departureAt={state.departureAt.toISOString()}
        hourlyRateCents={state.hourlyRateCents}
        showMoney={can(membership, "payments.view")}
        timeZone={state.timezone}
        limitNote={limitNote(state)}
      />
    ),
  };
}

/** Reviewing the open request. Call after the extensions.update guard. */
export async function reviewPanel(membership: Member, id: string): Promise<Panel> {
  const { guest, unit } = await loadActionReservation(membership.organizationId, id);
  const state = await getExtensionState(membership.organizationId, id);
  const request = state.openRequest;
  const base = { title: "Review late check-out", description: `${guest.name} · ${unit.name}.` };
  if (!request) return { ...base, unavailable: "There's no request waiting for approval." };
  const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: state.timezone });
  const until = new Date(state.departureAt.getTime() + request.hours * HOUR_MS);
  const asked = `${request.requestedBy ?? "Someone"} asked for +${request.hours}h (until ${time.format(until)})${request.note ? `: “${request.note}”` : "."}`;
  return {
    ...base,
    description: `${guest.name} · ${unit.name}. ${asked}`,
    form: (
      <ReviewExtensionForm
        reservationId={id}
        extensionId={request.id}
        hours={request.hours}
        untilLabel={time.format(until)}
        quotedRateCents={request.hourlyRateCents}
        canSetRate={can(membership, "payments.create")}
        showMoney={can(membership, "payments.view")}
        blockedReason={approvalBlockedReason(state)}
        fitNote={state.nextArrival ? limitNote(state) : "No one else needs the unit that day."}
      />
    ),
  };
}

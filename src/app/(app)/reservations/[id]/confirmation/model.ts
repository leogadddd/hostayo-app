import type { getReservationLedger } from "@/server/payments/service";
import type { getReservationDetail } from "@/server/reservations/service";

/** What the "reservation saved" page shows, worked out once for both layouts. */
export type ConfirmationData = {
  detail: Awaited<ReturnType<typeof getReservationDetail>>;
  /** Null for people who can't see money. */
  balances: Awaited<ReturnType<typeof getReservationLedger>>["balances"] | null;
  nights: number;
  isHold: boolean;
  /** When a hold lapses, in the property's time zone. */
  expiresLabel: string | null;
  reservationHref: string;
  shortRef: string;
  canSeeMoney: boolean;
  canConfirmHold: boolean;
  canRecordPayment: boolean;
};

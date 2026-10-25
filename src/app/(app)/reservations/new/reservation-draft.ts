import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Money as Banknote,
  Bed as BedDouble,
  Bank as Landmark,
  Receipt,
  ShieldCheck,
  DeviceMobile as Smartphone,
  Sparkle as Sparkles,
  Tag,
} from "@/components/ui/icons";
import type { ChargeType } from "@/lib/db/schema";
import { EDITABLE_CHARGE_TYPES } from "@/lib/db/schema";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import {
  buildDefaultCharges,
  CHARGE_TYPE_LABELS,
  computeTotals,
  type ChargeLineValues,
} from "@/lib/charges";
import type { DayRates } from "@/lib/rates";
import { nightlyRateResolver, type PricingRuleLike } from "@/lib/pricing-rules";
import { nightsBetween } from "@/lib/dates";
import { centavosToPesosInput, formatPHP, pesosToCentavos } from "@/lib/money";
import { type SelectMenuOption } from "@/components/ui/select-menu";
import { type ChoiceCardOption } from "@/components/ui/choice-cards";
import {
  createReservationAction,
  updateReservationAction,
  type ReservationFormState,
} from "../actions";
import { checkStayAvailabilityAction, type StayAvailability } from "./actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { plural } from "../../calendar/availability/stay-display";
import { type PlatformDisplay } from "@/components/app/platform-badge";
import {
  reservationFeeCents,
  type ReservationFeeRule,
} from "@/lib/reservation-fee";
import { PAYMENT_METHOD_LOGOS } from "@/components/app/payment-method-logo";

export interface UnitOption {
  id: string;
  label: string;
  name: string;
  propertyName: string | null;
  imageUrl: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  checkInTime: string;
  checkOutTime: string;
  nightlyRateCents: number | null;
  /** Weekday rates that differ from the nightly rate; owners only. */
  dayRates: DayRates | null;
  /** Active pricing rules that price this unit; owners only. */
  pricingRules: PricingRuleLike[];
  cleaningFeeCents: number | null;
  securityDepositCents: number | null;
  /** The down payment that confirms a booking from the team's own channels; owners only. */
  reservationFee: ReservationFeeRule | null;
}

export interface ChargeDraft {
  key: string;
  type: ChargeType;
  description: string;
  quantity: string;
  amountInput: string;
}

export type StepId = "stay" | "guests" | "charges" | "review";
export const STEP_LABELS: Record<StepId, string> = {
  stay: "Stay",
  guests: "Guests",
  charges: "Charges & payment",
  review: "Review",
};

export function toDraft(lines: ChargeLineValues[]): ChargeDraft[] {
  return lines.map((line) => ({
    key: crypto.randomUUID(),
    type: line.type,
    description: line.description,
    quantity: String(line.quantity),
    amountInput: centavosToPesosInput(line.unitAmountCents),
  }));
}

export function parseDraft(draft: ChargeDraft): ChargeLineValues | null {
  const description = draft.description.trim();
  const quantity = Number(draft.quantity);
  if (description.length < 2) return null;
  if (!Number.isInteger(quantity) || quantity < 1) return null;
  try {
    return {
      type: draft.type,
      description,
      quantity,
      unitAmountCents: pesosToCentavos(draft.amountInput || "0"),
    };
  } catch {
    return null;
  }
}

export function parsePayment(input: string): number | null {
  if (!input.trim()) return null;
  try {
    return pesosToCentavos(input);
  } catch {
    return null;
  }
}

export const HOLD_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "60", label: "1 hour" },
  { value: "240", label: "4 hours" },
  { value: "1440", label: "24 hours" },
];
export const PAYMENT_METHODS = [
  "gcash",
  "maya",
  "bank_transfer",
  "cash",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentAllocation = "booking" | "security_deposit";

export const CHARGE_TYPE_OPTIONS: SelectMenuOption<ChargeType>[] =
  EDITABLE_CHARGE_TYPES.map((type) => ({
    value: type,
    label: CHARGE_TYPE_LABELS[type],
    icon: {
      accommodation: BedDouble,
      cleaning: Sparkles,
      fee: Receipt,
      discount: Tag,
      security_deposit: ShieldCheck,
    }[type],
    description: {
      accommodation: "Nightly rate for the stay",
      cleaning: "One-off turnover cleaning",
      fee: "Anything else: extra bed, late checkout…",
      discount: "Negative amount off the booking",
      security_deposit: "Held and returned after checkout",
    }[type],
  }));

export const PAYMENT_METHOD_OPTIONS: ChoiceCardOption<PaymentMethod>[] =
  PAYMENT_METHODS.map((method) => ({
    value: method,
    label: PAYMENT_METHOD_LABELS[method],
    icon: {
      gcash: Smartphone,
      maya: Smartphone,
      bank_transfer: Landmark,
      cash: Banknote,
    }[method],
    logo: PAYMENT_METHOD_LOGOS[method],
  }));

/** The description a charge type gets when picked; blank means "write your own". */
export function autoDescription(type: ChargeType, nights: number | null) {
  switch (type) {
    case "accommodation":
      return nights
        ? `Accommodation (${plural(nights, "night")})`
        : "Accommodation";
    case "cleaning":
      return "Cleaning fee";
    case "security_deposit":
      return "Refundable security deposit";
    default:
      return "";
  }
}

/** What editing an existing reservation starts from. */
export interface ReservationEdit {
  reservationId: string;
  guestId: string;
  platformId: string | null;
  platformReference: string | null;
  occupants: string[];
  charges: ChargeLineValues[];
  /** Already recorded on the ledger; editing never changes payments. */
  paid: { bookingCents: number; depositCents: number };
}
export interface ReservationFormProps {
  /** Book straight to confirmed (needs reservations.update and payments.create). */
  canConfirm: boolean;
  /** Set charge lines and see prices (payments.create); others get the unit's standard rates. */
  canSetCharges: boolean;
  /** The first property's local date; the calendar can't book before it. */
  today: string;
  edit?: ReservationEdit;
  units: UnitOption[];
  guests: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }[];
  /** Show "New guest" (guests.create). */
  canCreateGuest?: boolean;
  /** Where bookings come from (Direct, Airbnb, …), in display order. */
  platforms: (PlatformDisplay & {
    id: string;
    key: string | null;
    downPaymentApplies: boolean;
    hasBookingCode: boolean;
  })[];
  defaultCheckIn: string;
  defaultCheckOut: string;
  requestedUnitId?: string;
  /** From a guest's page: starts with that guest selected. */
  requestedGuestId?: string;
  /** From an availability search: opens one blank name row per extra guest. */
  defaultGuestCount?: number;

  /** Which layout to draw; the state and rules are the same either way. */
  variant?: "mobile" | "desktop";
}

/**
 * Everything the reservation flow knows and does: its fields, the checks that
 * decide which step you can reach, and saving. Both the desktop wizard and the
 * phone form draw on it, so the rules are written once.
 */
export function useReservationDraft(props: ReservationFormProps) {
  const {
    units,
    guests: initialGuests,
    canCreateGuest = false,
    platforms,
    defaultCheckIn,
    defaultCheckOut,
    requestedUnitId,
    requestedGuestId,
    defaultGuestCount = 1,
    canConfirm,
    canSetCharges,
    edit,
  } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [action] = useState(() =>
    edit
      ? updateReservationAction.bind(null, edit.reservationId)
      : createReservationAction,
  );
  const [state, formAction, pending] = useActionState<
    ReservationFormState,
    FormData
  >(action, {});
  const [, startTransition] = useTransition();
  // Navigating after a save is its own transition, so the form can stay busy
  // until the next page has really appeared (it takes a moment to load).
  const [navigating, startNavigation] = useTransition();

  // Stay
  const [unitId, setUnitId] = useState(
    requestedUnitId && units.some((unit) => unit.id === requestedUnitId)
      ? requestedUnitId
      : (units[0]?.id ?? ""),
  );
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [additional, setAdditional] = useState<string[]>(() =>
    Array.from(
      { length: Math.max(0, defaultGuestCount - 1) },
      (_, index) => edit?.occupants[index] ?? "",
    ),
  );
  // Guests: "new" creates a guest profile from the contact fields.
  // Guests created from the "New guest" dialog join the list.
  const [guests, setGuests] = useState(initialGuests);
  // Nobody is picked until the user searches, unless we came from a guest's page.
  const [guestId, setGuestId] = useState(
    edit?.guestId ??
      (initialGuests.some((guest) => guest.id === requestedGuestId)
        ? requestedGuestId!
        : ""),
  );
  // Booking source: new reservations start on the first platform (Direct).
  const [platformId, setPlatformId] = useState(
    edit ? (edit.platformId ?? "") : (platforms[0]?.id ?? ""),
  );
  const [platformReference, setPlatformReference] = useState(
    edit?.platformReference ?? "",
  );
  const selectedPlatform = platforms.find(
    (platform) => platform.id === platformId,
  );
  // Only platforms that issue a booking code ask for it (Airbnb does;
  // Facebook, Messenger and Instagram don't). Set per platform in Settings.
  const takesReference = selectedPlatform?.hasBookingCode ?? true;
  // Editing lets the owner correct the existing guest's contact details too.
  const contactOf = (id: string) => {
    const guest = guests.find((candidate) => candidate.id === id);
    return {
      name: guest?.name ?? "",
      email: guest?.email ?? "",
      phone: guest?.phone ?? "",
    };
  };
  const [contact, setContact] = useState(() => contactOf(edit?.guestId ?? ""));
  // Charges: null = follow the unit/date defaults; any edit forks into a manual set.
  const [customCharges, setCustomCharges] = useState<ChargeDraft[] | null>(
    () => (edit ? toDraft(edit.charges) : null),
  );
  const [noPayment, setNoPayment] = useState(false);
  const [payment, setPayment] = useState({
    amount: "",
    allocation: "booking" as PaymentAllocation,
    method: "gcash" as PaymentMethod,
    reference: "",
    receivedAt: "",
  });
  // Checked: recorded as received now. Unchecked: the owner enters when.
  const [receivedNow, setReceivedNow] = useState(true);
  // Review
  const [submitMode, setSubmitMode] = useState<"hold" | "confirmed">(
    canConfirm ? "confirmed" : "hold",
  );
  const [holdMinutes, setHoldMinutes] = useState("1440");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useActionFeedback(state, {
    success: edit
      ? "Reservation updated."
      : submitMode === "hold"
        ? "Reservation hold created."
        : payment.amount.trim()
          ? "Reservation confirmed and payment recorded."
          : "Reservation confirmed.",
  });
  const saved = Boolean(state.success && state.reservationId);
  useEffect(() => {
    if (!state.success || !state.reservationId) return;
    const id = state.reservationId;
    startNavigation(() => {
      // The save already revalidated the reservation, the list and the
      // calendar on the server, so no extra refresh is needed here.
      if (edit) {
        router.push(`/reservations/${id}`);
      } else {
        router.push(`/reservations/${id}/confirmation`);
      }
    });
  }, [state, router, edit]);
  // Busy from the tap on Save until the next page shows, not only while the
  // request runs. Otherwise the buttons come back to life for a second, and a
  // second tap could save twice.
  const busy = pending || navigating || saved;
  const savingLabel = saved ? "Saved · opening…" : "Saving…";

  const selectedUnit = units.find((unit) => unit.id === unitId);
  const capacity = selectedUnit?.capacity ?? 1;
  const guestCount = 1 + additional.length;
  const validRange = Boolean(checkIn && checkOut && checkOut > checkIn);
  const nights = validRange ? nightsBetween(checkIn, checkOut) : null;
  const selectedGuest = guests.find((guest) => guest.id === guestId);
  function chooseGuest(id: string, list = guests) {
    setGuestId(id);
    const guest = list.find((candidate) => candidate.id === id);
    setContact({
      name: guest?.name ?? "",
      email: guest?.email ?? "",
      phone: guest?.phone ?? "",
    });
  }

  // Live availability, re-checked whenever the unit or dates change.
  const stayKey = `${unitId}:${checkIn}:${checkOut}`;
  // Editing without moving the stay: the dates are this reservation's own, so there's nothing to check.
  const unchangedStay =
    Boolean(edit) &&
    unitId === requestedUnitId &&
    checkIn === defaultCheckIn &&
    checkOut === defaultCheckOut;
  const [availability, setAvailability] = useState<{
    key: string;
    result: StayAvailability;
  } | null>(null);
  useEffect(() => {
    if (!unitId || !validRange || unchangedStay) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkStayAvailabilityAction(
        unitId,
        checkIn,
        checkOut,
        edit?.reservationId,
      )
        .then((result) => {
          if (!cancelled) setAvailability({ key: stayKey, result });
        })
        .catch(() => {
          if (!cancelled)
            setAvailability({
              key: stayKey,
              result: {
                status: "error",
                message: "Couldn’t check availability.",
              },
            });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    unitId,
    checkIn,
    checkOut,
    stayKey,
    validRange,
    unchangedStay,
    edit?.reservationId,
  ]);
  const currentAvailability =
    validRange && availability?.key === stayKey ? availability.result : null;

  const defaultCharges = useMemo(() => {
    if (!selectedUnit || selectedUnit.nightlyRateCents === null || !nights)
      return [];
    return toDraft(
      buildDefaultCharges({
        nightlyRateCents: selectedUnit.nightlyRateCents,
        dayRates: selectedUnit.dayRates,
        rateFor: nightlyRateResolver(
          {
            id: selectedUnit.id,
            propertyId: "",
            nightlyRateCents: selectedUnit.nightlyRateCents,
            dayRates: selectedUnit.dayRates,
          },
          selectedUnit.pricingRules,
        ),
        checkIn,
        cleaningFeeCents: selectedUnit.cleaningFeeCents,
        securityDepositCents: selectedUnit.securityDepositCents,
        nights,
      }),
    );
  }, [selectedUnit, nights, checkIn]);
  const charges = customCharges ?? defaultCharges;
  const parsed = useMemo(
    () => charges.map((draft) => ({ draft, line: parseDraft(draft) })),
    [charges],
  );
  const submittableLines = parsed
    .map((entry) => entry.line)
    .filter((line): line is ChargeLineValues => line !== null);
  const totals = computeTotals(submittableLines);
  const paymentCents = noPayment ? null : parsePayment(payment.amount);
  const feeRule =
    selectedPlatform && !selectedPlatform.downPaymentApplies
      ? null
      : (selectedUnit?.reservationFee ?? null);
  const feeCents = feeRule
    ? reservationFeeCents(feeRule, totals.bookingTotalCents)
    : 0;
  const feeCovered =
    !feeCents ||
    (payment.allocation === "booking" && (paymentCents ?? 0) >= feeCents);

  // What blocks each step; the first step with a problem caps how far you can go.
  const stepIssues: Record<StepId, string | null> = {
    stay: !selectedUnit
      ? "Choose a unit."
      : !validRange
        ? "Check-out must be after check-in."
        : guestCount > capacity
          ? `This unit sleeps ${capacity}. Lower the guest count or choose a larger unit.`
          : currentAvailability?.status === "unavailable"
            ? `These dates aren’t free: ${currentAvailability.reason}.`
            : null,
    guests: !selectedGuest
      ? "Search for the primary guest, or add a new one."
      : edit && contact.name.trim().length < 2
        ? "Enter the guest’s full name."
        : edit && !contact.email.trim() && !contact.phone.trim()
          ? "Add an email or phone number for the guest."
          : additional.some((name) => name.trim().length < 2)
            ? "Enter each additional guest’s full name."
            : null,
    charges: !canSetCharges
      ? null
      : submittableLines.length === 0
        ? "Add at least one charge with a description, quantity and amount."
        : parsed.some((entry) => entry.line === null)
          ? "Fix the highlighted charge lines. Amounts look like 5500 or 5,500.50."
          : !edit && payment.amount.trim() && paymentCents === null
            ? "Enter the payment like 3000 or 3,000.50."
            : !edit &&
                paymentCents &&
                !receivedNow &&
                !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(payment.receivedAt)
              ? "Enter the date and time the payment was received."
              : null,
    review: null,
  };
  // Editing has no review step: every part is open as a tab, and Save is always at hand.
  const steps: StepId[] = edit
    ? canSetCharges
      ? ["stay", "guests", "charges"]
      : ["stay", "guests"]
    : canSetCharges
      ? ["stay", "guests", "charges", "review"]
      : ["stay", "guests", "review"];
  const firstBlocked = steps.findIndex((step) => stepIssues[step] !== null);
  const requested = steps.indexOf(
    (searchParams.get("step") ?? "stay") as StepId,
  );
  const stepIndex = Math.max(
    0,
    Math.min(
      requested === -1 ? 0 : requested,
      // Creating goes one step at a time; editing can open any tab.
      edit || firstBlocked === -1 ? steps.length - 1 : firstBlocked,
    ),
  );
  const step = steps[stepIndex]!;
  const [showIssue, setShowIssue] = useState(false);

  /** Moving forward adds a history entry (so browser back works); the Back button replaces it. */
  function goTo(target: StepId, replace = false) {
    const query = new URLSearchParams(searchParams.toString());
    if (target === "stay") query.delete("step");
    else query.set("step", target);
    window.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      `?${query}`,
    );
    setShowIssue(false);
    setReviewError(null);
    document
      .getElementById("main-content")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }
  function next() {
    if (stepIssues[step]) {
      setShowIssue(true);
      return;
    }
    goTo(steps[stepIndex + 1]!);
  }

  function setGuestCount(count: number) {
    const clamped = Math.max(1, Math.min(50, count));
    setAdditional((current) =>
      clamped - 1 <= current.length
        ? current.slice(0, clamped - 1)
        : [
            ...current,
            ...Array.from({ length: clamped - 1 - current.length }, () => ""),
          ],
    );
  }
  function updateCharge(key: string, patch: Partial<ChargeDraft>) {
    setCustomCharges((current) =>
      (current ?? defaultCharges).map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  }
  // Switching type fills in its description, unless the owner wrote their own.
  function changeChargeType(draft: ChargeDraft, type: ChargeType) {
    const untouched =
      !draft.description.trim() ||
      draft.description === autoDescription(draft.type, nights);
    updateCharge(draft.key, {
      type,
      ...(untouched ? { description: autoDescription(type, nights) } : {}),
    });
  }

  function submitEdit() {
    const data = new FormData();
    data.set("unitId", unitId);
    data.set("checkIn", checkIn);
    data.set("checkOut", checkOut);
    data.set("guestCount", String(guestCount));
    data.set("platformId", platformId);
    data.set("platformReference", platformReference.trim());
    for (const name of additional) data.append("occupantName", name.trim());
    // The update action edits the chosen profile's contact, or creates one for "new".
    data.set("guestId", guestId);
    data.set("guestName", contact.name.trim());
    data.set("guestEmail", contact.email.trim());
    data.set("guestPhone", contact.phone.trim());
    for (const { draft } of parsed.filter((entry) => entry.line !== null)) {
      data.append("chargeType", draft.type);
      data.append("chargeDescription", draft.description.trim());
      data.append("chargeQuantity", draft.quantity);
      data.append("chargeAmountPesos", draft.amountInput || "0");
    }
    startTransition(() => formAction(data));
  }

  /** Edit mode: save from any step once nothing blocks it. */
  function saveNow() {
    if (firstBlocked !== -1) {
      goTo(steps[firstBlocked]!);
      setShowIssue(true);
      return;
    }
    setReviewError(null);
    submitEdit();
  }

  function submit() {
    setReviewError(null);
    if (edit) {
      submitEdit();
      return;
    }
    if (submitMode === "hold" && paymentCents) {
      setReviewError(
        "An initial payment can be recorded only with a confirmed booking. Choose Confirm booking, or remove the payment to place a hold.",
      );
      return;
    }
    if (
      submitMode === "confirmed" &&
      totals.bookingTotalCents > 0 &&
      !paymentCents &&
      !noPayment
    ) {
      setReviewError(
        "Record the payment received, or mark “No payment received yet” in Charges & payment.",
      );
      return;
    }
    if (submitMode === "confirmed" && paymentCents && !feeCovered) {
      setReviewError(
        `This unit's reservation fee is ${formatPHP(feeCents)}. Record at least that towards the booking, or place a hold until it's paid.`,
      );
      return;
    }
    const data = new FormData();
    data.set("mode", submitMode);
    data.set("idempotencyKey", idempotencyKey);
    data.set("unitId", unitId);
    data.set("checkIn", checkIn);
    data.set("checkOut", checkOut);
    data.set("guestCount", String(guestCount));
    data.set("platformId", platformId);
    data.set("platformReference", platformReference.trim());
    for (const name of additional) data.append("occupantName", name.trim());
    // New guests are created by the picker's dialog, so this is always a saved profile.
    data.set("guestMode", "existing");
    data.set("guestId", guestId);
    data.set("chargesJson", JSON.stringify(submittableLines));
    data.set("holdMinutes", holdMinutes);
    if (noPayment) data.set("acknowledgeUnpaid", "on");
    if (paymentCents) {
      data.set("paymentAmountPesos", payment.amount.trim());
      data.set("paymentAllocation", payment.allocation);
      data.set("paymentMethod", payment.method);
      data.set("paymentReference", payment.reference.trim());
      data.set("paymentReceivedAt", receivedNow ? "" : payment.receivedAt);
    }
    startTransition(() => formAction(data));
  }

  return {
    ...props,
    // Defaulted in the destructuring above, so they are never undefined here.
    canCreateGuest,
    defaultGuestCount,
    router,
    searchParams,
    action,
    state,
    formAction,
    startTransition,
    unitId,
    setUnitId,
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    additional,
    setAdditional,
    guests,
    setGuests,
    guestId,
    setGuestId,
    platformId,
    setPlatformId,
    platformReference,
    setPlatformReference,
    selectedPlatform,
    takesReference,
    contactOf,
    contact,
    setContact,
    customCharges,
    setCustomCharges,
    noPayment,
    setNoPayment,
    payment,
    setPayment,
    receivedNow,
    setReceivedNow,
    submitMode,
    setSubmitMode,
    holdMinutes,
    setHoldMinutes,
    reviewError,
    setReviewError,
    idempotencyKey,
    selectedUnit,
    capacity,
    guestCount,
    validRange,
    nights,
    selectedGuest,
    chooseGuest,
    stayKey,
    unchangedStay,
    availability,
    setAvailability,
    currentAvailability,
    defaultCharges,
    charges,
    parsed,
    submittableLines,
    totals,
    paymentCents,
    feeRule,
    feeCents,
    feeCovered,
    stepIssues,
    steps,
    firstBlocked,
    requested,
    stepIndex,
    step,
    showIssue,
    setShowIssue,
    goTo,
    next,
    setGuestCount,
    updateCharge,
    changeChargeType,
    submitEdit,
    saveNow,
    submit,
    pending: busy,
    savingLabel,
  };
}

export type ReservationDraft = ReturnType<typeof useReservationDraft>;

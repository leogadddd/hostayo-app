export interface DefaultPlatform {
  /** Stable key, so reseeding recognises a platform the team renamed. */
  key: string;
  name: string;
  /** Served from `public/platforms`; the app's CSP only allows same-origin images. */
  logoUrl: string;
  websiteUrl: string | null;
  color: string;
  /** Whether the unit's down payment applies to bookings from this platform. */
  downPaymentApplies: boolean;
  /** Whether its bookings come with a confirmation code to record. */
  hasBookingCode: boolean;
}

/**
 * Channels every organization starts with, in the order the reservation form
 * lists them.
 */
export const DEFAULT_PLATFORMS: readonly DefaultPlatform[] = [
  {
    key: "direct",
    name: "Direct",
    logoUrl: "/platforms/direct.svg",
    websiteUrl: null,
    color: "#2F5D50",
    hasBookingCode: false,
    downPaymentApplies: true,
  },
  {
    key: "airbnb",
    name: "Airbnb",
    logoUrl: "/platforms/airbnb.svg",
    websiteUrl: "https://www.airbnb.com",
    color: "#FF5A5F",
    hasBookingCode: true,
    downPaymentApplies: false,
  },
  {
    key: "booking_com",
    name: "Booking.com",
    logoUrl: "/platforms/booking-com.svg",
    websiteUrl: "https://www.booking.com",
    color: "#003580",
    hasBookingCode: true,
    downPaymentApplies: false,
  },
  {
    key: "agoda",
    name: "Agoda",
    logoUrl: "/platforms/agoda.svg",
    websiteUrl: "https://www.agoda.com",
    color: "#5C2D91",
    hasBookingCode: true,
    downPaymentApplies: false,
  },
  {
    key: "expedia",
    name: "Expedia",
    logoUrl: "/platforms/expedia.svg",
    websiteUrl: "https://www.expedia.com",
    color: "#FDB913",
    hasBookingCode: true,
    downPaymentApplies: false,
  },
  {
    key: "facebook",
    name: "Facebook",
    logoUrl: "/platforms/facebook.svg",
    websiteUrl: "https://www.facebook.com",
    color: "#1877F2",
    hasBookingCode: false,
    downPaymentApplies: true,
  },
  {
    key: "messenger",
    name: "Messenger",
    logoUrl: "/platforms/messenger.svg",
    websiteUrl: "https://www.messenger.com",
    color: "#0A7CFF",
    hasBookingCode: false,
    downPaymentApplies: true,
  },
  {
    key: "instagram",
    name: "Instagram",
    logoUrl: "/platforms/instagram.svg",
    websiteUrl: "https://www.instagram.com",
    color: "#E1306C",
    hasBookingCode: false,
    downPaymentApplies: true,
  },
  {
    key: "walk_in",
    name: "Walk-in",
    logoUrl: "/platforms/walk-in.svg",
    websiteUrl: null,
    color: "#8A6F4D",
    hasBookingCode: false,
    downPaymentApplies: true,
  },
  {
    key: "referral",
    name: "Referral",
    logoUrl: "/platforms/referral.svg",
    websiteUrl: null,
    color: "#6B7F3A",
    hasBookingCode: false,
    downPaymentApplies: true,
  },
];

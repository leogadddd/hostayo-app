import type { PublicBookedRange } from "@/lib/public-demo";

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Whether the night starting on `day` is taken: a stay holds its check-in night but not its check-out day. */
export function isNightBooked(booked: PublicBookedRange[], day: string) {
  return booked.some((range) => day >= range.checkIn && day < range.checkOut);
}

/** The first night from `today` that is free, or null when nothing is open for a year. */
export function nextOpenDate(booked: PublicBookedRange[], today: string) {
  for (let i = 0; i < 365; i += 1) {
    const day = addDays(today, i);
    if (!isNightBooked(booked, day)) return day;
  }
  return null;
}

/** The next `days` nights from `today`, each with its date and whether it is free. */
export function availabilityStrip(
  booked: PublicBookedRange[],
  today: string,
  days = 14,
) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    return { date, free: !isNightBooked(booked, date) };
  });
}

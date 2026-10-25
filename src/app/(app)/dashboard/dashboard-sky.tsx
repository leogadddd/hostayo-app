import type { DayPeriod } from "./model";

const SKY: Record<
  DayPeriod,
  { top: string; mid: string; glow: string; orb: string; window: string }
> = {
  morning: {
    top: "#fbd5bd",
    mid: "#fdeadb",
    glow: "#f9bf8f",
    orb: "#f7ab6b",
    window: "#ffffff",
  },
  afternoon: {
    top: "#c2e2df",
    mid: "#e3eee3",
    glow: "#f8d98c",
    orb: "#f5c24f",
    window: "#ffffff",
  },
  evening: {
    top: "#cbc3e5",
    mid: "#f0dbd8",
    glow: "#ffffff",
    orb: "#f6f1e1",
    window: "#f6d98b",
  },
};

/**
 * The soft backdrop behind the phone dashboard's greeting: a pastel sky that
 * follows the time of day, a sun or moon, and a quiet row of rooftops. It is
 * low in contrast and fades out at the bottom so it melts into the page.
 */
export function DashboardSky({
  period,
  className,
}: {
  period: DayPeriod;
  className?: string;
}) {
  const c = SKY[period];
  const night = period === "evening";
  const fade = "linear-gradient(to bottom, #000 58%, transparent 100%)";
  return (
    <svg
      viewBox="0 0 375 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      <defs>
        <linearGradient id="sky-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.top} />
          <stop offset="0.7" stopColor={c.mid} />
          <stop offset="1" stopColor={c.mid} stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="sky-glow">
          <stop offset="0" stopColor={c.glow} stopOpacity="0.85" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="375" height="220" fill="url(#sky-fill)" />

      {/* sun or moon */}
      <circle cx="300" cy="70" r="92" fill="url(#sky-glow)" />
      <circle cx="300" cy="70" r={night ? 17 : 21} fill={c.orb} />
      {night ? (
        <circle cx="307" cy="65" r="15" fill={c.top} opacity="0.9" />
      ) : null}
      {night ? (
        <g fill="#ffffff" opacity="0.8">
          <circle cx="240" cy="38" r="1.4" />
          <circle cx="262" cy="86" r="1.1" />
          <circle cx="342" cy="30" r="1.3" />
          <circle cx="205" cy="70" r="1" />
        </g>
      ) : (
        <g fill="#ffffff" opacity="0.72">
          <ellipse cx="236" cy="96" rx="26" ry="8" />
          <ellipse cx="226" cy="90" rx="12" ry="9" />
          <ellipse cx="248" cy="89" rx="14" ry="10" />
          <ellipse cx="344" cy="112" rx="18" ry="6" />
          <ellipse cx="337" cy="107" rx="9" ry="7" />
        </g>
      )}

      {/* hills and rooftops */}
      <path
        d="M0 176Q70 150 150 170T290 160T375 168V220H0Z"
        fill="var(--color-sage-deep)"
        opacity="0.28"
      />
      <g fill="var(--color-sage-deep)" opacity="0.5">
        <path d="M205 190v-24h30v24zM200 168l20-18 20 18z" />
        <path d="M246 190v-40h46v40zM240 152l29-26 29 26z" />
        <path d="M300 190v-30h34v30zM295 162l22-20 22 20z" />
        <circle cx="352" cy="176" r="11" />
        <rect x="350" y="180" width="4" height="12" />
        <circle cx="186" cy="182" r="8" />
      </g>
      <g fill={c.window} opacity={night ? 0.9 : 0.55}>
        <rect x="213" y="172" width="6" height="6" rx="1" />
        <rect x="256" y="160" width="7" height="7" rx="1" />
        <rect x="273" y="160" width="7" height="7" rx="1" />
        <rect x="309" y="168" width="6" height="6" rx="1" />
        <rect x="322" y="168" width="6" height="6" rx="1" />
      </g>
      <path
        d="M0 196Q110 180 220 192T375 186V220H0Z"
        fill="var(--color-moss)"
        opacity="0.3"
      />
    </svg>
  );
}

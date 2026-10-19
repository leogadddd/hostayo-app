import { cn } from "@/lib/utils";

/**
 * Friendly line illustrations for empty pages. Colours come from the app's
 * theme variables, so they follow the palette; shapes are plain SVG with no
 * external assets. Decorative only (`aria-hidden`).
 */
export type EmptyArtName =
  | "house"
  | "dashboard"
  | "units"
  | "calendar"
  | "guests"
  | "tasks"
  | "money"
  | "reservations"
  | "reviews";

const INK = "var(--color-pine)";
const SAGE = "var(--color-sage)";
const MOSS = "var(--color-moss)";
const CLAY = "var(--color-clay)";
const SAND = "var(--color-sand)";
const SAND_DEEP = "var(--color-sand-deep)";
const CREAM = "var(--color-cream)";
const PAPER = "var(--color-card)";
const SKIN = "#e8b98f";
const AQUA = "#3fb6c9";
const STROKE = { fill: "none", stroke: INK, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Ground({ y = 176 }: { y?: number }) {
  return <ellipse cx="140" cy={y} rx="104" ry="9" fill={SAGE} opacity="0.7" />;
}

/** A builder repairing a little house, hammer swinging. */
function House() {
  return (
    <>
      <Ground />
      {/* cloud + sun */}
      <circle cx="232" cy="38" r="14" fill={SAND_DEEP} opacity="0.55" />
      <g {...STROKE} fill={PAPER} strokeWidth={2.5}>
        <path d="M30 52c-8 0-12-6-10-11 2-6 9-8 14-5 3-7 14-7 18 0 7-2 13 3 12 9-1 5-5 7-10 7z" />
      </g>
      {/* house */}
      <g {...STROKE}>
        <rect x="112" y="98" width="104" height="72" rx="3" fill={CREAM} />
        <path d="M102 102 164 52l62 50z" fill={CLAY} />
        <rect x="190" y="62" width="12" height="26" fill={SAND_DEEP} />
        <rect x="156" y="126" width="26" height="44" rx="3" fill={MOSS} />
        <rect x="124" y="114" width="22" height="22" rx="2" fill={SAGE} />
        <path d="M135 114v22M124 125h22" strokeWidth={2} />
        <rect x="190" y="116" width="18" height="18" rx="2" fill={SAGE} strokeDasharray="4 5" />
      </g>
      <circle cx="176" cy="150" r="2" fill={INK} />
      {/* ladder */}
      <g {...STROKE} strokeWidth={2.5}>
        <path d="M232 170 220 92M250 170 238 92" />
        <path d="M229 150h19M226 130h19M223 110h19" />
      </g>
      {/* builder */}
      <g {...STROKE}>
        <path d="M58 170v-22M76 170v-22" />
        <rect x="52" y="108" width="30" height="44" rx="9" fill={MOSS} />
        <circle cx="67" cy="92" r="14" fill={SKIN} />
        <path d="M52 90c0-14 8-20 15-20s15 6 15 20z" fill={SAND_DEEP} />
        <path d="M48 90h38" />
        <circle cx="62" cy="95" r="1.6" fill={INK} stroke="none" />
        <circle cx="73" cy="95" r="1.6" fill={INK} stroke="none" />
        <path d="M63 101q4 3 8 0" strokeWidth={2} />
      </g>
      {/* hammer arm */}
      <g className="empty-art-hammer" style={{ transformOrigin: "78px 118px" }}>
        <g {...STROKE}>
          <path d="M78 118 100 104" />
          <path d="M100 104 112 84" strokeWidth={4} stroke={SAND_DEEP} />
          <rect x="104" y="76" width="18" height="10" rx="2" fill={INK} transform="rotate(-28 113 81)" />
        </g>
      </g>
      {/* sparks */}
      <g stroke={CLAY} strokeWidth={2.5} strokeLinecap="round">
        <path d="M126 102l8-8M132 108l10-3M124 92l2-10" />
      </g>
    </>
  );
}

/** A host presenting a board of rising numbers. */
function Dashboard() {
  return (
    <>
      <Ground />
      <g {...STROKE}>
        <rect x="96" y="30" width="150" height="112" rx="10" fill={PAPER} />
        <path d="M130 142v28M212 142v28" />
        <path d="M112 118h118" strokeWidth={2} />
      </g>
      {/* bars */}
      <g {...STROKE} strokeWidth={2.5}>
        <rect x="116" y="92" width="16" height="26" rx="2" fill={SAGE} />
        <rect x="140" y="76" width="16" height="42" rx="2" fill={MOSS} />
        <rect x="164" y="84" width="16" height="34" rx="2" fill={SAGE} />
        <rect x="188" y="58" width="16" height="60" rx="2" fill={CLAY} />
      </g>
      {/* rising line */}
      <path
        d="M118 84l24-14 24 6 38-26"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 7"
      />
      <path d="M216 42l-2 11 10-4z" fill={INK} />
      {/* mini house tile */}
      <g {...STROKE} strokeWidth={2.5}>
        <rect x="214" y="92" width="22" height="22" rx="4" fill={SAND} />
        <path d="M219 106l6-6 6 6M221 106v5h8v-5" />
      </g>
      {/* host */}
      <g {...STROKE}>
        <path d="M44 170v-14a22 22 0 0 1 44 0v14z" fill={MOSS} />
        <circle cx="66" cy="106" r="19" fill={SKIN} />
        <path d="M47 104c0-17 9-25 19-25s19 8 19 25c-6-7-12-10-19-10s-13 3-19 10z" fill={INK} />
        <circle cx="59" cy="109" r="1.8" fill={INK} stroke="none" />
        <circle cx="73" cy="109" r="1.8" fill={INK} stroke="none" />
        <path d="M60 117q6 5 12 0" strokeWidth={2} />
        <path d="M80 148 98 122" />
      </g>
      {/* coffee */}
      <g {...STROKE} strokeWidth={2.5} transform="translate(-14 0)">
        <path d="M252 170v-18h20v18z" fill={CLAY} />
        <path d="M272 156h4a4 4 0 0 1 0 8h-4" />
      </g>
      <g stroke={CLAY} strokeWidth={2.5} strokeLinecap="round">
        <path d="M252 28v9M247 32h10M60 52v8M56 56h8" />
      </g>
    </>
  );
}

/** A row of unit doors, one ajar, with a key waiting. */
function Units() {
  const doors = [78, 140, 202];
  return (
    <>
      <Ground />
      {/* facade */}
      <g {...STROKE}>
        <rect x="44" y="46" width="192" height="124" rx="6" fill={CREAM} />
        <rect x="36" y="34" width="208" height="18" rx="4" fill={CLAY} />
      </g>
      {doors.map((x, i) => (
        <g key={x}>
          <g {...STROKE}>
            <rect x={x - 22} y="82" width="44" height="88" rx="4" fill={i === 1 ? "#ffe3a0" : MOSS} />
            {i === 1 ? (
              <>
                {/* open door */}
                <path d={`M${x - 22} 82 L${x - 40} 92 V176 L${x - 22} 170z`} fill={MOSS} />
                <circle cx={x - 33} cy="134" r="2.4" fill={INK} stroke="none" />
                <path d={`M${x - 8} 170 L${x + 6} 120 L${x + 20} 170z`} fill="#ffcf7a" stroke="none" opacity=".7" />
              </>
            ) : (
              <circle cx={x + 12} cy="130" r="2.6" fill={INK} stroke="none" />
            )}
          </g>
          <rect x={x - 9} y="62" width="18" height="12" rx="3" fill={PAPER} stroke={INK} strokeWidth={2} />
          <path d={`M${x - 4} 68h8`} stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
      {/* welcome mat */}
      <rect x="116" y="172" width="48" height="8" rx="3" fill={SAND_DEEP} stroke={INK} strokeWidth={2.5} />
      {/* key on a tag */}
      <g {...STROKE} strokeWidth={2.5}>
        <path d="M244 124v14" />
        <rect x="233" y="138" width="22" height="30" rx="5" fill={AQUA} />
        <circle cx="244" cy="148" r="4" fill={PAPER} />
        <path d="M244 154v8" />
      </g>
      <g {...STROKE} strokeWidth={2.5}>
        <path d="M10 170v-14h24v14z" fill={CLAY} />
        <path d="M22 156c-12-4-14-18-12-26 11 2 16 12 12 26zM22 156c9-5 16-7 21-19-12-2-21 7-21 19z" fill={MOSS} />
      </g>
      <g stroke={CLAY} strokeWidth={2.5} strokeLinecap="round">
        <path d="M140 18v8M136 22h8M222 20v7M218.5 23.5h7" />
      </g>
    </>
  );
}

/** A wall calendar with a few marked days. */
function Calendar() {
  const days = Array.from({ length: 21 }, (_, i) => i);
  const marked = new Set([4, 5, 6, 12, 13]);
  return (
    <>
      <Ground />
      <g {...STROKE}>
        <rect x="76" y="40" width="128" height="124" rx="12" fill={PAPER} />
        <path d="M76 70h128" />
        <path d="M76 52q0-12 12-12h104q12 0 12 12v18H76z" fill={CLAY} />
        <path d="M106 32v18M174 32v18" strokeWidth={4} />
      </g>
      {days.map((i) => {
        const x = 92 + (i % 7) * 16;
        const y = 82 + Math.floor(i / 7) * 24;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="12"
            height="16"
            rx="3"
            fill={marked.has(i) ? SAGE : SAND}
            stroke={marked.has(i) ? INK : "none"}
            strokeWidth={marked.has(i) ? 2 : 0}
          />
        );
      })}
      {/* pencil */}
      <g {...STROKE} strokeWidth={2.5} transform="rotate(32 222 118)">
        <rect x="214" y="78" width="14" height="62" rx="2" fill={SAND_DEEP} />
        <path d="M214 140h14l-7 14z" fill={CREAM} />
        <path d="M214 90h14" />
      </g>
      {/* potted plant */}
      <g {...STROKE} strokeWidth={2.5}>
        <path d="M44 170v-16h26v16z" fill={CLAY} />
        <path d="M57 154c-14-4-16-20-14-28 12 2 18 14 14 28zM57 154c10-6 18-8 24-22-14-2-24 8-24 22z" fill={MOSS} />
      </g>
    </>
  );
}

function Person({ x, tone, hair }: { x: number; tone: string; hair: string }) {
  return (
    <g {...STROKE}>
      <path d={`M${x - 24} 170v-14a24 24 0 0 1 48 0v14z`} fill={tone} />
      <circle cx={x} cy="106" r="20" fill={SKIN} />
      <path d={`M${x - 21} 104c0-18 10-26 21-26s21 8 21 26c-6-8-14-11-21-11s-15 3-21 11z`} fill={hair} />
      <circle cx={x - 7} cy="109" r="1.8" fill={INK} stroke="none" />
      <circle cx={x + 7} cy="109" r="1.8" fill={INK} stroke="none" />
      <path d={`M${x - 5} 117q5 4 10 0`} strokeWidth={2} />
    </g>
  );
}

/** Two guests arriving with a suitcase. */
function Guests() {
  return (
    <>
      <Ground />
      <Person x={104} tone={MOSS} hair={INK} />
      <Person x={166} tone={CLAY} hair={SAND_DEEP} />
      <g {...STROKE}>
        <rect x="198" y="132" width="44" height="38" rx="6" fill={SAND_DEEP} />
        <path d="M210 132v-8a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v8" />
        <path d="M198 148h44" strokeWidth={2} />
        <circle cx="206" cy="174" r="3" fill={INK} />
        <circle cx="234" cy="174" r="3" fill={INK} />
      </g>
      <g stroke={CLAY} strokeWidth={2.5} strokeLinecap="round">
        <path d="M132 62v10M120 66l5 8M144 66l-5 8" />
      </g>
    </>
  );
}

/** A bucket, a broom and a ticked checklist. */
function Tasks() {
  return (
    <>
      <Ground />
      <g {...STROKE}>
        <rect x="100" y="34" width="84" height="110" rx="10" fill={PAPER} />
        <rect x="124" y="26" width="36" height="16" rx="6" fill={SAND_DEEP} />
        <path d="M118 70l6 6 12-12M118 98l6 6 12-12" stroke={MOSS} strokeWidth={4} />
        <path d="M146 70h26M146 98h26M118 124h54" strokeWidth={2.5} />
      </g>
      <g {...STROKE}>
        <path d="M54 172l-6-62" />
        <path d="M36 172c2-14 8-22 12-26 6 4 12 12 14 26z" fill={SAND_DEEP} />
        <path d="M40 160h20M42 150h16" strokeWidth={2} />
      </g>
      <g {...STROKE}>
        <path d="M196 120h38l-5 50h-28z" fill={SAGE} />
        <path d="M196 120q19-14 38 0" />
        <path d="M200 142h30" strokeWidth={2} />
      </g>
      <g stroke={CLAY} strokeWidth={2.5} strokeLinecap="round">
        <path d="M222 92v10M217 97h10M80 60v8M76 64h8" />
      </g>
    </>
  );
}

/** A receipt with a stack of coins. */
function Money() {
  return (
    <>
      <Ground />
      <g {...STROKE}>
        <path d="M92 28h90v128l-10-8-10 8-10-8-10 8-10-8-10 8-10-8-10 8-10-8z" fill={PAPER} />
        <path d="M106 52h46M106 72h62M106 92h36M106 112h54" strokeWidth={2.5} />
        <path d="M158 52h10" strokeWidth={2.5} stroke={CLAY} />
      </g>
      <g {...STROKE}>
        <ellipse cx="212" cy="164" rx="24" ry="8" fill={SAND_DEEP} />
        <path d="M188 164v-10c0 4 10 8 24 8s24-4 24-8v10" fill={SAND_DEEP} />
        <ellipse cx="212" cy="150" rx="24" ry="8" fill={SAND_DEEP} />
        <path d="M188 150v-10c0 4 10 8 24 8s24-4 24-8v10" fill={SAND_DEEP} />
        <ellipse cx="212" cy="136" rx="24" ry="8" fill={SAND} />
        <path d="M212 132v8M209 134h6" strokeWidth={2} />
      </g>
      <g {...STROKE}>
        <circle cx="62" cy="150" r="20" fill={SAND_DEEP} />
        <path d="M62 140v20M56 146h9a4 4 0 0 1 0 8h-9" strokeWidth={2.5} />
      </g>
    </>
  );
}

/** A room key on a tag beside a suitcase. */
function Reservations() {
  return (
    <>
      <Ground />
      <g {...STROKE}>
        <rect x="64" y="104" width="86" height="64" rx="8" fill={CLAY} />
        <path d="M92 104v-12a8 8 0 0 1 8-8h14a8 8 0 0 1 8 8v12" />
        <path d="M64 130h86" strokeWidth={2.5} />
        <rect x="100" y="124" width="14" height="14" rx="3" fill={SAND} />
      </g>
      <g {...STROKE}>
        <circle cx="196" cy="146" r="17" fill={SAND_DEEP} />
        <circle cx="196" cy="146" r="6" fill={PAPER} />
        <path d="M213 146h40M240 146v12M251 146v9" />
      </g>
      <g stroke={MOSS} strokeWidth={2.5} strokeLinecap="round">
        <path d="M188 100l6 8M200 94l2 10M176 108l8 4" />
      </g>
    </>
  );
}

/** Two speech bubbles with stars, waiting for the first review. */
function Reviews() {
  return (
    <>
      <Ground />
      {/* back bubble */}
      <g {...STROKE}>
        <path d="M150 40h84a10 10 0 0 1 10 10v44a10 10 0 0 1-10 10h-18l-14 16-6-16h-46a10 10 0 0 1-10-10V50a10 10 0 0 1 10-10z" fill={SAGE} />
        <path d="M170 68h54M170 82h34" strokeWidth={2.5} />
      </g>
      {/* front bubble with stars */}
      <g {...STROKE}>
        <path d="M46 78h96a10 10 0 0 1 10 10v50a10 10 0 0 1-10 10h-62l-20 18-4-18h-10a10 10 0 0 1-10-10V88a10 10 0 0 1 10-10z" fill={PAPER} />
      </g>
      <g stroke={INK} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M66 102l4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.4z" fill={SAND_DEEP} />
        <path d="M96 102l4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.4z" fill={SAND_DEEP} />
        <path d="M126 102l4.2 8.6 9.4 1.4-6.8 6.6 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.4z" fill="none" strokeDasharray="4 5" />
      </g>
      <g stroke={MOSS} strokeWidth={2.5} strokeLinecap="round">
        <path d="M256 30l6-6M262 44h8M248 20v-8" />
      </g>
    </>
  );
}

const ART: Record<EmptyArtName, () => React.ReactElement> = {
  house: House,
  dashboard: Dashboard,
  units: Units,
  calendar: Calendar,
  guests: Guests,
  tasks: Tasks,
  money: Money,
  reservations: Reservations,
  reviews: Reviews,
};

export function EmptyArt({
  name,
  className,
}: {
  name: EmptyArtName;
  className?: string;
}) {
  const Art = ART[name];
  return (
    <svg
      viewBox="0 0 280 190"
      role="presentation"
      aria-hidden
      focusable="false"
      className={cn("mx-auto mb-6 h-auto w-56 sm:w-64", className)}
    >
      <Art />
    </svg>
  );
}

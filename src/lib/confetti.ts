/**
 * A dependency-free confetti burst on a throwaway full-screen canvas. Does
 * nothing for people who prefer reduced motion.
 */

const COLORS = ["#a64e37", "#cfddd3", "#6f927e", "#c49a6c", "#f1ddb9", "#203a35", "#f3e4de"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  wobble: number;
  life: number;
}

export function fireConfetti({
  particleCount = 80,
  origin = { x: 0.5, y: 0.6 },
  spread = 70,
  velocity = 11,
}: {
  particleCount?: number;
  /** Fractions of the viewport. */
  origin?: { x: number; y: number };
  /** Degrees either side of straight up. */
  spread?: number;
  velocity?: number;
} = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "2147483000",
  });
  document.body.appendChild(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }
  context.scale(ratio, ratio);

  const particles: Particle[] = Array.from({ length: particleCount }, () => {
    const angle = ((-90 + (Math.random() - 0.5) * 2 * spread) * Math.PI) / 180;
    const speed = velocity * (0.55 + Math.random() * 0.6);
    return {
      x: origin.x * window.innerWidth,
      y: origin.y * window.innerHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      wobble: Math.random() * 10,
      life: 1,
    };
  });

  const frame = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;
    for (const particle of particles) {
      if (particle.life <= 0) continue;
      particle.vy += 0.28;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.wobble += 0.1;
      particle.x += particle.vx + Math.sin(particle.wobble);
      particle.y += particle.vy;
      particle.rotation += particle.spin;
      particle.life -= 0.006;
      if (particle.y > window.innerHeight + 20) particle.life = 0;
      if (particle.life <= 0) continue;
      alive++;
      context.save();
      context.globalAlpha = Math.min(1, particle.life * 2);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
      context.restore();
    }
    if (alive > 0) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** A bigger celebration: bursts from both sides and the middle. */
export function fireCelebration() {
  fireConfetti({ particleCount: 120, origin: { x: 0.15, y: 0.75 }, spread: 45, velocity: 15 });
  fireConfetti({ particleCount: 120, origin: { x: 0.85, y: 0.75 }, spread: 45, velocity: 15 });
  setTimeout(() => fireConfetti({ particleCount: 160, origin: { x: 0.5, y: 0.45 }, spread: 120, velocity: 13 }), 250);
}

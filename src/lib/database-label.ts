/**
 * Which database this server is talking to, for the dev-only sidebar badge.
 * Returns null unless running the development server.
 *
 * Set DATABASE_ENV_LABEL (for example "Dev" or "Production") to name a remote
 * database explicitly; otherwise it is derived from DATABASE_URL.
 */
export function getDatabaseLabel(): string | null {
  if (process.env.NODE_ENV !== "development") return null;

  const explicit = process.env.DATABASE_ENV_LABEL?.trim();
  if (explicit) return `${explicit} database`;

  try {
    const { hostname } = new URL(process.env.DATABASE_URL ?? "");
    if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
      return "Local database";
    }
    return `Remote database (${(hostname.split(".")[0] ?? hostname).replace(/-pooler$/, "")})`;
  } catch {
    return null;
  }
}

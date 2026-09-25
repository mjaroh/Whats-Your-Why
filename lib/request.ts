import "server-only";
import { createHash } from "node:crypto";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Salted hash so raw IPs are never written anywhere. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "askesis";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

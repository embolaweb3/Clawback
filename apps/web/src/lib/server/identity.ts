import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "clawback_owner_id";

/**
 * A per-browser anonymous identity, not a real account system (build
 * prompt §12: "prefer a smaller product... over a grand platform
 * thesis" — full auth is explicitly out of MVP scope, see LIMITATIONS.md).
 * This is enough to make CaseStore's ownership checks meaningful: one
 * browser cannot read or approve another browser's case, which is the
 * property that actually matters for the demo and for §16's authorization
 * requirement, without building a login system this MVP doesn't need yet.
 */
export async function getOrCreateOwnerId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = `owner_${randomUUID()}`;
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}

import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/server/status";

/**
 * Public, read-only, non-sensitive: which 0G integrations this deployment
 * actually has live credentials for right now, and which network they're
 * pointed at. No case data, no keys, no addresses beyond the deployed
 * contract's own (already-public) address. Backs the "0G LIVE" /
 * "UNCONFIGURED" badges on the landing page and receipt page — both
 * derived from this exact runtime state, never hardcoded.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(getIntegrationStatus());
}

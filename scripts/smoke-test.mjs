// A real, live end-to-end smoke test against a running Clawback server —
// not a mock, not a unit test. This is the script used to produce the
// live run documented in README.md's demo section.
//
// Usage:
//   pnpm --filter @clawback/web build
//   pnpm --filter @clawback/web start -- -p 3100   (in one terminal)
//   node scripts/smoke-test.mjs                     (in another)
const BASE = process.env.CLAWBACK_SMOKE_TEST_BASE_URL ?? "http://localhost:3100";

function cookieHeader(setCookieHeaders) {
  return setCookieHeaders.map((c) => c.split(";")[0]).join("; ");
}

async function createCase(accountLast4) {
  const res = await fetch(`${BASE}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantName: "Acme Streaming",
      accountIdentifierLast4: accountLast4,
      subscriptionDetails: "Premium plan, $19.99/month.",
      desiredOutcome: "Cancel and refund this month's $19.99 charge.",
    }),
  });
  const cookie = cookieHeader(res.headers.getSetCookie?.() ?? []);
  const body = await res.json();
  return { status: res.status, body, cookie };
}

async function main() {
  // The sandbox provider's outcome is a deterministic hash of
  // (merchant, account) — see packages/providers/src/sandboxProvider.ts.
  // This loop searches for an account that lands in the refund bucket
  // rather than assuming one, exactly like the unit tests do.
  let winner = null;
  for (let i = 0; i < 60 && !winner; i++) {
    const account = String(1000 + i);
    const { body, cookie } = await createCase(account);
    const caseId = body.case.caseId;
    const proposalId = body.case.proposal.proposalId;

    const approveRes = await fetch(`${BASE}/api/cases/${caseId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ proposalId }),
    });
    const approved = await approveRes.json();
    if (approved.case.outcome?.outcomeType === "refund_issued") {
      winner = { caseId, cookie, approved };
    }
  }

  if (!winner) throw new Error("No refund_issued outcome found in 60 tries.");

  console.log("=== FULL SUCCESSFUL CASE ===");
  console.log(JSON.stringify(winner.approved, null, 2));

  const verifyRes = await fetch(`${BASE}/api/cases/${winner.caseId}/verify`, {
    headers: { Cookie: winner.cookie },
  });
  const verified = await verifyRes.json();
  console.log("=== INDEPENDENT VERIFICATION ===", verifyRes.status);
  console.log(JSON.stringify(verified, null, 2));
  console.log("allCryptographicChecksPassed:", verified.report.allCryptographicChecksPassed);

  // Cross-owner authorization: a fresh anonymous identity (no cookie)
  // must never be able to read someone else's case.
  const strangerRes = await fetch(`${BASE}/api/cases/${winner.caseId}`);
  console.log("=== STRANGER ACCESS (expect 403) ===", strangerRes.status);
  if (strangerRes.status !== 403) {
    throw new Error(`Expected 403 for cross-owner access, got ${strangerRes.status}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

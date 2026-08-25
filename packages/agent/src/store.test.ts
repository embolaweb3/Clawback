import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encryptAtRest } from "@clawback/privacy";
import { CaseNotFoundError, UnauthorizedCaseAccessError, FileCaseStore, InMemoryCaseStore } from "./store.js";
import type { CaseRecord } from "./caseRecord.js";

const KEY = randomBytes(32).toString("hex");

function makeRecord(overrides: Partial<CaseRecord> = {}): CaseRecord {
  const now = new Date().toISOString();
  return {
    caseId: "case_test_1",
    ownerId: "owner_1",
    category: "subscription_cancellation",
    state: "DRAFT",
    encryptedInput: encryptAtRest("{}", KEY),
    proposal: null,
    encryptedProposalMessage: null,
    approval: null,
    execution: null,
    outcome: null,
    receipt: null,
    settlement: null,
    environment: "sandbox",
    degradedReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("InMemoryCaseStore", () => {
  it("throws CaseNotFoundError for an unknown case", async () => {
    const store = new InMemoryCaseStore();
    await expect(store.get("nope")).rejects.toThrow(CaseNotFoundError);
  });

  it("enforces ownership on getForOwner", async () => {
    const store = new InMemoryCaseStore();
    await store.create(makeRecord());
    await expect(store.getForOwner("case_test_1", "someone_else")).rejects.toThrow(
      UnauthorizedCaseAccessError,
    );
    await expect(store.getForOwner("case_test_1", "owner_1")).resolves.toMatchObject({
      caseId: "case_test_1",
    });
  });

  it("only mutates state through a validated transition", async () => {
    const store = new InMemoryCaseStore();
    await store.create(makeRecord());
    const submitted = await store.transition("case_test_1", "SUBMIT", () => ({}));
    expect(submitted.state).toBe("SUBMITTED");
    // Skipping straight to APPROVE from SUBMITTED must fail — it's not a
    // legal transition, so the store must reject it rather than quietly
    // accepting an arbitrary state.
    await expect(store.transition("case_test_1", "APPROVE", () => ({}))).rejects.toThrow();
  });
});

describe("FileCaseStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "clawback-store-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("persists a case to disk and reads it back", async () => {
    const store = new FileCaseStore(dir);
    await store.create(makeRecord());
    const read = await store.get("case_test_1");
    expect(read.caseId).toBe("case_test_1");
    expect(read.state).toBe("DRAFT");
  });

  it("survives being reopened with a fresh store instance (durability, not just in-memory)", async () => {
    const store1 = new FileCaseStore(dir);
    await store1.create(makeRecord());
    await store1.transition("case_test_1", "SUBMIT", () => ({}));

    const store2 = new FileCaseStore(dir);
    const record = await store2.get("case_test_1");
    expect(record.state).toBe("SUBMITTED");
  });

  it("lists cases scoped to their owner only", async () => {
    const store = new FileCaseStore(dir);
    await store.create(makeRecord({ caseId: "case_a", ownerId: "owner_a" }));
    await store.create(makeRecord({ caseId: "case_b", ownerId: "owner_b" }));
    const ownerACases = await store.listForOwner("owner_a");
    expect(ownerACases.map((c) => c.caseId)).toEqual(["case_a"]);
  });

  it("never writes plaintext sensitive fields to disk", async () => {
    const store = new FileCaseStore(dir);
    await store.create(
      makeRecord({ encryptedInput: encryptAtRest(JSON.stringify({ merchantName: "SecretCo" }), KEY) }),
    );
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(join(dir, "case_test_1.json"), "utf8");
    expect(raw).not.toContain("SecretCo");
  });
});

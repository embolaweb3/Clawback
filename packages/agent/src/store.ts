import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyTransition, type CaseEvent } from "@clawback/shared";
import type { CaseRecord } from "./caseRecord.js";

export class CaseNotFoundError extends Error {
  constructor(caseId: string) {
    super(`No case found with id ${caseId}.`);
    this.name = "CaseNotFoundError";
  }
}

export class UnauthorizedCaseAccessError extends Error {
  constructor(caseId: string) {
    super(`Not authorized to access case ${caseId}.`);
    this.name = "UnauthorizedCaseAccessError";
  }
}

/**
 * The only interface allowed to persist a CaseRecord. Its `transition`
 * method is the sole way a case's state field can change (build prompt
 * §13: "Never let arbitrary UI actions mutate state without transition
 * validation") — it calls the shared state machine's `applyTransition`
 * itself, so a caller cannot bypass it by constructing a record with an
 * arbitrary `state` value.
 */
export interface CaseStore {
  create(record: CaseRecord): Promise<void>;
  get(caseId: string): Promise<CaseRecord>;
  getForOwner(caseId: string, ownerId: string): Promise<CaseRecord>;
  /** Applies `event` to the case's current state via the shared state
   *  machine, then calls `patch` with the now-transitioned record to
   *  produce the fields specific to that step (a proposal, an execution
   *  result, etc.), and persists the result. Throws IllegalTransitionError
   *  (from @clawback/shared) if `event` isn't legal from the current state. */
  transition(
    caseId: string,
    event: CaseEvent,
    patch: (record: CaseRecord) => Partial<CaseRecord>,
  ): Promise<CaseRecord>;
}

abstract class BaseCaseStore implements CaseStore {
  abstract create(record: CaseRecord): Promise<void>;
  abstract get(caseId: string): Promise<CaseRecord>;
  protected abstract save(record: CaseRecord): Promise<void>;

  async getForOwner(caseId: string, ownerId: string): Promise<CaseRecord> {
    const record = await this.get(caseId);
    if (record.ownerId !== ownerId) {
      throw new UnauthorizedCaseAccessError(caseId);
    }
    return record;
  }

  async transition(
    caseId: string,
    event: CaseEvent,
    patch: (record: CaseRecord) => Partial<CaseRecord>,
  ): Promise<CaseRecord> {
    const current = await this.get(caseId);
    const nextState = applyTransition(current.state, event); // throws IllegalTransitionError
    const patched: CaseRecord = {
      ...current,
      ...patch(current),
      state: nextState,
      updatedAt: new Date().toISOString(),
    };
    await this.save(patched);
    return patched;
  }
}

/** Used by tests and by any short-lived process. Not durable across
 *  restarts — see FileCaseStore for the store apps/web actually uses. */
export class InMemoryCaseStore extends BaseCaseStore {
  private readonly records = new Map<string, CaseRecord>();

  async create(record: CaseRecord): Promise<void> {
    this.records.set(record.caseId, record);
  }

  async get(caseId: string): Promise<CaseRecord> {
    const record = this.records.get(caseId);
    if (!record) throw new CaseNotFoundError(caseId);
    return record;
  }

  protected async save(record: CaseRecord): Promise<void> {
    this.records.set(record.caseId, record);
  }
}

/**
 * One JSON file per case under CLAWBACK_DATA_DIR. This is an honestly
 * small-scale persistence layer, not a production database — see
 * ARCHITECTURE.md for exactly where a real deployment would swap this
 * for Postgres without touching Orchestrator or CaseStore's interface.
 */
export class FileCaseStore extends BaseCaseStore {
  constructor(private readonly dataDir: string) {
    super();
  }

  private pathFor(caseId: string): string {
    return join(this.dataDir, `${caseId}.json`);
  }

  async create(record: CaseRecord): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await this.save(record);
  }

  async get(caseId: string): Promise<CaseRecord> {
    try {
      const raw = await readFile(this.pathFor(caseId), "utf8");
      return JSON.parse(raw) as CaseRecord;
    } catch {
      throw new CaseNotFoundError(caseId);
    }
  }

  async listForOwner(ownerId: string): Promise<CaseRecord[]> {
    await mkdir(this.dataDir, { recursive: true });
    const files = await readdir(this.dataDir);
    const records: CaseRecord[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const raw = await readFile(join(this.dataDir, file), "utf8");
      const record = JSON.parse(raw) as CaseRecord;
      if (record.ownerId === ownerId) records.push(record);
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  protected async save(record: CaseRecord): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(this.pathFor(record.caseId), JSON.stringify(record, null, 2), "utf8");
  }
}

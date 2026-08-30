import type { AuthenticatedUserId } from "modules/auth/api";
import type { StrategyAuthoringDraftRepository } from "./ports";
import type { StrategyAuthoringDraftRecord } from "./authoring";

function copyDraft(draft: StrategyAuthoringDraftRecord): StrategyAuthoringDraftRecord {
  return structuredClone(draft);
}

export class InMemoryStrategyAuthoringDraftRepository
  implements StrategyAuthoringDraftRepository<StrategyAuthoringDraftRecord> {
  public readonly drafts = new Map<string, StrategyAuthoringDraftRecord>();

  public async insert(
    ownerUserId: AuthenticatedUserId,
    draft: StrategyAuthoringDraftRecord,
  ): Promise<StrategyAuthoringDraftRecord> {
    if (draft.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
    if (this.drafts.has(draft.id)) throw new Error("DRAFT_ALREADY_EXISTS");
    const stored = copyDraft(draft);
    this.drafts.set(draft.id, stored);
    return copyDraft(stored);
  }

  public async getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    draftId: string,
  ): Promise<StrategyAuthoringDraftRecord | undefined> {
    const draft = this.drafts.get(draftId);
    return draft?.ownerUserId === ownerUserId ? copyDraft(draft) : undefined;
  }

  public async save(
    ownerUserId: AuthenticatedUserId,
    draft: StrategyAuthoringDraftRecord,
  ): Promise<StrategyAuthoringDraftRecord> {
    if (draft.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
    const current = this.drafts.get(draft.id);
    if (!current || current.ownerUserId !== ownerUserId) throw new Error("DRAFT_NOT_FOUND");
    const stored = copyDraft(draft);
    this.drafts.set(draft.id, stored);
    return copyDraft(stored);
  }
}

export function createInMemoryStrategyAuthoringDraftRepository(): InMemoryStrategyAuthoringDraftRepository {
  return new InMemoryStrategyAuthoringDraftRepository();
}

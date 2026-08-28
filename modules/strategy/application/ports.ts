import type { AuthenticatedUserId } from "modules/auth/api";

export interface StrategyDefinitionRepository<TDefinition> {
  allocateNextVersion(ownerUserId: AuthenticatedUserId, logicalFamilyKey: string): Promise<number>;
  insert(ownerUserId: AuthenticatedUserId, definition: TDefinition): Promise<TDefinition>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TDefinition | undefined>;
  listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TDefinition[]; nextCursor?: string }>;
}
export interface CompositeDefinitionRepository<TDefinition> {
  allocateNextVersion(ownerUserId: AuthenticatedUserId, logicalFamilyKey: string): Promise<number>;
  insert(ownerUserId: AuthenticatedUserId, definition: TDefinition): Promise<TDefinition>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TDefinition | undefined>;
  listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TDefinition[]; nextCursor?: string }>;
}

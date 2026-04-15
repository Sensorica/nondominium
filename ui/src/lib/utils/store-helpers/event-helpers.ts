/**
 * Helpers for emitting standardized store events.
 *
 * Stores can use these to publish `created` / `updated` / `deleted` events
 * to subscribers (cache, derived stores, UI listeners) without each store
 * re-implementing the same boilerplate.
 */

export interface EventEmitter<TEvent> {
  emit(event: TEvent): void;
}

export interface StandardEvents<TEntity> {
  created: { entity: TEntity };
  updated: { entity: TEntity };
  deleted: { entityHash: Uint8Array };
}

export interface StandardEventEmitters<TEntity> {
  emitCreated: (entity: TEntity) => void;
  emitUpdated: (entity: TEntity) => void;
  emitDeleted: (entityHash: Uint8Array) => void;
}

/**
 * Build the standard `created` / `updated` / `deleted` emitters from a base
 * emitter that accepts a tagged-union event payload.
 */
export function createStandardEventEmitters<TEntity>(
  emit: (
    event:
      | { type: 'created'; entity: TEntity }
      | { type: 'updated'; entity: TEntity }
      | { type: 'deleted'; entityHash: Uint8Array }
  ) => void
): StandardEventEmitters<TEntity> {
  return {
    emitCreated: (entity) => emit({ type: 'created', entity }),
    emitUpdated: (entity) => emit({ type: 'updated', entity }),
    emitDeleted: (entityHash) => emit({ type: 'deleted', entityHash })
  };
}

/**
 * Variant of `createStandardEventEmitters` that includes an additional
 * `status_changed` event for entities that carry a workflow status field.
 */
export interface StatusAwareEventEmitters<TEntity, TStatus>
  extends StandardEventEmitters<TEntity> {
  emitStatusChanged: (entity: TEntity, oldStatus: TStatus, newStatus: TStatus) => void;
}

export function createStatusAwareEventEmitters<TEntity, TStatus>(
  emit: (
    event:
      | { type: 'created'; entity: TEntity }
      | { type: 'updated'; entity: TEntity }
      | { type: 'deleted'; entityHash: Uint8Array }
      | { type: 'status_changed'; entity: TEntity; oldStatus: TStatus; newStatus: TStatus }
  ) => void
): StatusAwareEventEmitters<TEntity, TStatus> {
  return {
    emitCreated: (entity) => emit({ type: 'created', entity }),
    emitUpdated: (entity) => emit({ type: 'updated', entity }),
    emitDeleted: (entityHash) => emit({ type: 'deleted', entityHash }),
    emitStatusChanged: (entity, oldStatus, newStatus) =>
      emit({ type: 'status_changed', entity, oldStatus, newStatus })
  };
}

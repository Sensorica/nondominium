import { getContext, setContext } from 'svelte';
import { Effect as E, Exit, Cause, Layer, pipe } from 'effect';
import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import type {
  GovernanceRule,
  NdoDescriptor,
  NdoTransitionHistoryEvent,
  PersonRole,
  ResourceSpecificationListing,
  UpdateLifecycleStageInput,
  VfCommitment,
  VfEconomicEvent
} from '@nondominium/shared-types';
import type { EconomicResourceRow } from '$lib/utils/holochain-records';
import { NdoServiceTag, NdoServiceResolved } from '../services/zomes/ndo.service';
import { ResourceServiceTag, ResourceServiceResolved } from '../services/zomes/resource.service';
import {
  GovernanceServiceTag,
  GovernanceServiceResolved
} from '../services/zomes/governance.service';
import { PersonServiceTag, PersonServiceResolved } from '../services/zomes/person.service';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../services/holochain.service.svelte';
import { ndoDescriptorCache } from './ndo-cache';
import { dataOf, errorOf, idle, reduce, type EntityState } from '$lib/domain/entity-state';
import { createFiberSet, isTaskInterrupted } from '$lib/utils/fiber-set';

export { isTaskInterrupted };

/**
 * One store per open NDO (design D3). `NdoView` creates it for its hash, publishes it
 * through context and destroys it on teardown or when the hash changes; `destroy()`
 * interrupts every fiber the store forked, and no result arriving afterwards is written.
 *
 * Calls services directly, never another store. Promise-returning queries resolve with
 * their data (read failures are folded into the result exactly as the components used to
 * fold them) and reject with `TaskInterrupted` only when the store was destroyed.
 */

export type NdoMember = { id: string; name: string; role?: string };
export type SpecificationWithInstances = {
  listing: ResourceSpecificationListing;
  instances: EconomicResourceRow[];
};
export type RuleWithSpec = { rule: GovernanceRule; specName: string; specHash: ActionHash };

export interface NdoStore {
  readonly hashB64: string;
  /** null when the URL hash does not decode. */
  readonly actionHash: ActionHash | null;
  readonly parseError: string | null;
  readonly descriptor: EntityState<NdoDescriptor, string>;
  /**
   * The cloned `ndo` cell holding this NDO's Layer 0 identity. Every Layer 1 and Layer 2
   * call is addressed to it: the identity those entries reference only exists in that DHT,
   * never in the shared provisioned cell. `null` means a legacy NDO still living in the
   * shared cell (or not resolved yet), and calls fall back to it.
   */
  readonly cellId: CellId | null;
  readonly members: EntityState<NdoMember[], string>;

  // Compatibility getters derived from `descriptor`, so component markup is unchanged.
  readonly ndo: NdoDescriptor | null;
  /** True only on a first load with nothing to show (not while refreshing cached data). */
  readonly isLoading: boolean;
  /** Set only when a load failed with nothing to show; a failed refresh keeps the data. */
  readonly loadError: string | null;

  refresh(): void;
  loadMembers(): void;
  join(): Promise<boolean>;
  advanceLifecycle(
    input: UpdateLifecycleStageInput
  ): Promise<{ ok: true } | { ok: false; cause: string }>;
  /** null when the read failed: an empty history and a failed read stay distinct. */
  transitionHistory(ndoHash: ActionHash): Promise<NdoTransitionHistoryEvent[] | null>;
  /** null when the read failed. */
  associatedGroupIds(): Promise<string[] | null>;
  specificationsWithInstances(): Promise<SpecificationWithInstances[]>;
  governanceRules(): Promise<{ hasSpecifications: boolean; rules: RuleWithSpec[] }>;
  /** `agent` is null when the conductor did not return this agent's key. */
  myRoles(): Promise<{ agent: AgentPubKey | null; roles: PersonRole[] }>;
  activity(): Promise<{ commitments: VfCommitment[]; events: VfEconomicEvent[] }>;
  personName(agentB64: string): Promise<{ ok: true; name: string | null } | { ok: false }>;
  destroy(): void;
}

// ─── Services, provided once for every NDO store ───────────────────────────────

const NdoStoreServicesResolved = Layer.mergeAll(
  NdoServiceResolved,
  ResourceServiceResolved,
  GovernanceServiceResolved,
  PersonServiceResolved,
  HolochainClientServiceLive
);

const services = pipe(
  E.gen(function* () {
    return {
      ndo: yield* NdoServiceTag,
      resource: yield* ResourceServiceTag,
      governance: yield* GovernanceServiceTag,
      person: yield* PersonServiceTag,
      holochain: yield* HolochainClientServiceTag
    };
  }),
  E.provide(NdoStoreServicesResolved),
  E.runSync
);

const DESCRIPTOR_ERROR = 'Could not refresh NDO details from the chain. Data shown may be cached.';
const MEMBERS_ERROR = 'Could not load members. They may not have reached this node yet.';

/** Swallows the rejection of a fire-and-forget task interrupted by `destroy()`. */
const ignoreInterrupt = (error: unknown): void => {
  if (!isTaskInterrupted(error)) throw error;
};

// ─── Store factory ─────────────────────────────────────────────────────────────

export function createNdoStore(hashB64: string): NdoStore {
  const tasks = createFiberSet();

  let actionHash: ActionHash | null = null;
  let parseError: string | null = null;
  try {
    actionHash = decodeHashFromBase64(decodeURIComponent(hashB64)) as ActionHash;
  } catch {
    parseError = 'Could not decode resource specification hash from the URL.';
  }

  let descriptor = $state.raw<EntityState<NdoDescriptor, string>>(idle());
  let members = $state.raw<EntityState<NdoMember[], string>>(idle());
  let cellId = $state.raw<CellId | null>(null);

  // Seed immediately from the in-memory cache (populated by NdoCard click).
  const cached = ndoDescriptorCache.get(hashB64);
  if (cached) descriptor = reduce(descriptor, { _tag: 'Seeded', data: cached });

  /** Runs a program that cannot fail, unwrapping its value; a defect rejects. */
  async function query<A>(program: E.Effect<A>): Promise<A> {
    const exit = await tasks.run(program);
    if (Exit.isSuccess(exit)) return exit.value;
    throw Cause.squash(exit.cause);
  }

  /**
   * Last specification listing read for this NDO. A failed read falls back to it (or to
   * an empty list), which is what `resourceStore.fetchSpecificationsForNdo` did for the tabs.
   */
  let lastSpecifications: ResourceSpecificationListing[] | null = null;

  const specificationsFor = (hash: ActionHash, cell: CellId | undefined) =>
    E.gen(function* () {
      const exit = yield* E.exit(services.resource.getSpecificationsForNdo(hash, cell));
      if (Exit.isSuccess(exit)) {
        lastSpecifications = exit.value;
        return exit.value;
      }
      return lastSpecifications ?? [];
    });

  function refresh(): void {
    const hash = actionHash;
    if (!hash) return;
    descriptor = reduce(descriptor, { _tag: 'FetchStarted' });
    tasks.run(services.ndo.getNdoDescriptorForSpecActionHash(hash)).then((exit) => {
      if (Exit.isSuccess(exit)) {
        descriptor = reduce(descriptor, {
          _tag: 'FetchSucceeded',
          data: exit.value,
          at: Date.now()
        });
        // Keep cache up to date with the latest on-chain version.
        ndoDescriptorCache.set(hashB64, exit.value);
      } else {
        descriptor = reduce(descriptor, { _tag: 'FetchFailed', error: DESCRIPTOR_ERROR });
      }
    }, ignoreInterrupt);
  }

  function resolveCell(hash: ActionHash): void {
    tasks.run(services.ndo.resolveCellIdForNdo(hash)).then((exit) => {
      cellId = Exit.isSuccess(exit) ? exit.value : null;
    }, ignoreInterrupt);
  }

  function loadMembers(): void {
    members = reduce(members, { _tag: 'FetchStarted' });
    tasks.run(services.ndo.getNdoMembers(hashB64)).then((exit) => {
      members = Exit.isSuccess(exit)
        ? reduce(members, {
            _tag: 'FetchSucceeded',
            data: exit.value.map((m) => ({ ...m, role: 'Member' })),
            at: Date.now()
          })
        : reduce(members, { _tag: 'FetchFailed', error: MEMBERS_ERROR });
    }, ignoreInterrupt);
  }

  async function join(): Promise<boolean> {
    const exit = await tasks.run(services.ndo.joinNdo(hashB64));
    return Exit.isSuccess(exit);
  }

  async function advanceLifecycle(
    input: UpdateLifecycleStageInput
  ): Promise<{ ok: true } | { ok: false; cause: string }> {
    const exit = await tasks.run(services.ndo.updateLifecycleStage(input));
    if (Exit.isSuccess(exit)) return { ok: true };
    // Effect 4 stringifies a Cause as its wrapper structure; surface the error's message.
    const error = Cause.squash(exit.cause);
    return { ok: false, cause: error instanceof Error ? error.message : String(error) };
  }

  async function transitionHistory(
    ndoHash: ActionHash
  ): Promise<NdoTransitionHistoryEvent[] | null> {
    const exit = await tasks.run(services.ndo.getNdoTransitionHistory(ndoHash));
    return Exit.isSuccess(exit) ? exit.value : null;
  }

  async function associatedGroupIds(): Promise<string[] | null> {
    const exit = await tasks.run(services.ndo.getAssociatedGroupIds(hashB64));
    return Exit.isSuccess(exit) ? exit.value : null;
  }

  function specificationsWithInstances(): Promise<SpecificationWithInstances[]> {
    const hash = actionHash;
    if (!hash) return Promise.resolve([]);
    const cell = cellId ?? undefined;
    return query(
      E.gen(function* () {
        const listings = yield* specificationsFor(hash, cell);
        const out: SpecificationWithInstances[] = [];
        for (const listing of listings) {
          const exit = yield* E.exit(
            services.resource.getResourcesBySpecification(listing.action_hash, cell)
          );
          out.push({ listing, instances: Exit.isSuccess(exit) ? exit.value : [] });
        }
        return out;
      })
    );
  }

  function governanceRules(): Promise<{ hasSpecifications: boolean; rules: RuleWithSpec[] }> {
    const hash = actionHash;
    if (!hash) return Promise.resolve({ hasSpecifications: false, rules: [] });
    const cell = cellId ?? undefined;
    return query(
      E.gen(function* () {
        const listings = yield* specificationsFor(hash, cell);
        if (listings.length === 0) return { hasSpecifications: false, rules: [] };
        const rules: RuleWithSpec[] = [];
        for (const listing of listings) {
          const exit = yield* E.exit(
            services.resource.getResourceSpecificationWithRules(listing.action_hash, cell)
          );
          if (Exit.isSuccess(exit)) {
            for (const rule of exit.value.governance_rules) {
              rules.push({
                rule,
                specName: listing.specification.name,
                specHash: listing.action_hash
              });
            }
          }
        }
        return { hasSpecifications: true, rules };
      })
    );
  }

  function myRoles(): Promise<{ agent: AgentPubKey | null; roles: PersonRole[] }> {
    return query(
      E.gen(function* () {
        const agentExit = yield* E.exit(
          E.tryPromise(() => services.holochain.getMyAgentPubKey())
        );
        if (Exit.isFailure(agentExit) || !agentExit.value) return { agent: null, roles: [] };
        const agent = agentExit.value;
        const rolesExit = yield* E.exit(services.person.getPersonRoles(agent));
        return { agent, roles: Exit.isSuccess(rolesExit) ? rolesExit.value : [] };
      })
    );
  }

  function activity(): Promise<{ commitments: VfCommitment[]; events: VfEconomicEvent[] }> {
    const hash = actionHash;
    if (!hash) return Promise.resolve({ commitments: [], events: [] });
    const cell = cellId ?? undefined;
    return query(
      E.gen(function* () {
        const commitmentsExit = yield* E.exit(services.governance.getAllCommitments(cell));
        const commitments = Exit.isSuccess(commitmentsExit) ? commitmentsExit.value : [];

        const listings = yield* specificationsFor(hash, cell);
        const merged: VfEconomicEvent[] = [];
        for (const listing of listings) {
          const rowsExit = yield* E.exit(
            services.resource.getResourcesBySpecification(listing.action_hash, cell)
          );
          if (Exit.isFailure(rowsExit)) continue;
          for (const row of rowsExit.value) {
            const evExit = yield* E.exit(
              services.governance.getEventsByResource(row.actionHash, cell)
            );
            if (Exit.isSuccess(evExit)) merged.push(...evExit.value);
          }
        }
        // Also include any agent-wide events that carry this ndo hash
        const allEvExit = yield* E.exit(services.governance.getAllEconomicEvents(cell));
        if (Exit.isSuccess(allEvExit)) {
          for (const ev of allEvExit.value) {
            if (
              encodeHashToBase64(ev.ndo_identity_hash) === encodeHashToBase64(hash) &&
              !merged.some(
                (m) =>
                  m.event_time === ev.event_time &&
                  m.action === ev.action &&
                  m.resource_quantity === ev.resource_quantity
              )
            ) {
              merged.push(ev);
            }
          }
        }
        return {
          commitments,
          events: merged.sort((a, b) => Number(b.event_time) - Number(a.event_time))
        };
      })
    );
  }

  async function personName(
    agentB64: string
  ): Promise<{ ok: true; name: string | null } | { ok: false }> {
    const exit = await tasks.run(services.person.getAllPersons());
    if (Exit.isFailure(exit)) return { ok: false };
    const match = exit.value.find((p) => encodeHashToBase64(p.agent_pub_key) === agentB64);
    return { ok: true, name: match?.name ?? null };
  }

  function destroy(): void {
    tasks.close();
  }

  if (actionHash) {
    resolveCell(actionHash);
    refresh();
  }

  return {
    hashB64,
    actionHash,
    parseError,
    get descriptor() {
      return descriptor;
    },
    get cellId() {
      return cellId;
    },
    get members() {
      return members;
    },
    get ndo() {
      return dataOf(descriptor);
    },
    get isLoading() {
      return descriptor._tag === 'Loading';
    },
    get loadError() {
      return descriptor._tag === 'Failure' ? errorOf(descriptor) : null;
    },
    refresh,
    loadMembers,
    join,
    advanceLifecycle,
    transitionHistory,
    associatedGroupIds,
    specificationsWithInstances,
    governanceRules,
    myRoles,
    activity,
    personName,
    destroy
  };
}

// ─── Context ───────────────────────────────────────────────────────────────────

const NDO_STORE_KEY = Symbol('ndo-store');

/** Reads the NDO store currently open in the enclosing `NdoView`. */
export type NdoStoreAccessor = () => NdoStore;

/**
 * Publishes the open NDO's store to descendants. An accessor rather than the store itself,
 * because `NdoView` replaces the store when its hash changes while its children stay mounted.
 */
export function setNdoStore(accessor: NdoStoreAccessor): void {
  setContext(NDO_STORE_KEY, accessor);
}

export function getNdoStore(): NdoStoreAccessor {
  const accessor = getContext<NdoStoreAccessor | undefined>(NDO_STORE_KEY);
  if (!accessor) throw new Error('getNdoStore() called outside an NdoView');
  return accessor;
}

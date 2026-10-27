import { Effect as E, Exit, pipe } from 'effect';
import type { ActionHash, AgentPubKey, CellId, EntryHash } from '@holochain/client';
import {
  ResourceServiceTag,
  ResourceServiceResolved,
  type ResourceService
} from '../services/zomes/resource.service.js';
import { withLoadingState, createLoadingStateSetter } from '$lib/utils/store-helpers/core';
import type {
  ResourceSpecification,
  EconomicResource,
  ResourceSpecificationListing,
  ResourceSpecificationInput,
  CreateResourceSpecificationOutput,
  GovernanceRuleInput,
  CheckRuleDataConstraintsInput,
  ConstraintViolation
} from '@nondominium/shared-types';

// ─── Store type ────────────────────────────────────────────────────────────────

export type ResourceStore = {
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly allResourceSpecifications: ResourceSpecification[];
  readonly resourceSpecificationListings: ResourceSpecificationListing[];
  readonly specificationsByNdo: Map<string, ResourceSpecificationListing[]>;
  readonly allEconomicResources: EconomicResource[];
  readonly myResources: EconomicResource[];
  readonly selectedSpecification: ResourceSpecification | null;
  readonly selectedResource: EconomicResource | null;
  readonly resourcesByCustodian: Map<string, EconomicResource[]>;

  createResourceSpecification: (
    specData: ResourceSpecificationInput,
    cellId?: CellId
  ) => Promise<CreateResourceSpecificationOutput | null>;
  fetchAllResourceSpecifications: () => Promise<void>;
  fetchSpecificationsForNdo: (
    ndoHash: ActionHash,
    cellId?: CellId
  ) => Promise<ResourceSpecificationListing[]>;
  fetchResourceSpecification: (hash: ActionHash) => Promise<ResourceSpecification | null>;
  createEconomicResource: (
    resourceData: Omit<EconomicResource, 'created_at'>
  ) => Promise<ActionHash | null>;
  fetchEconomicResource: (hash: ActionHash) => Promise<EconomicResource | null>;
  fetchResourcesByCustodian: (custodian: AgentPubKey) => Promise<EconomicResource[]>;
  fetchMyResources: (myAgentPubKey: AgentPubKey) => Promise<void>;
  transferResourceCustody: (
    resourceHash: ActionHash,
    newCustodian: AgentPubKey
  ) => Promise<ActionHash | null>;
  updateResourceQuantity: (
    resourceHash: ActionHash,
    newQuantity: number
  ) => Promise<ActionHash | null>;
  searchResourcesBySpecification: (specificationHash: EntryHash) => Promise<EconomicResource[]>;
  getResourceHistory: (resourceHash: ActionHash) => Promise<EconomicResource[]>;
  updateResourceSpecification: (
    hash: ActionHash,
    updatedSpec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ) => Promise<ActionHash | null>;
  deleteResourceSpecification: (hash: ActionHash) => Promise<ActionHash | null>;
  archiveEconomicResource: (hash: ActionHash) => Promise<ActionHash | null>;
  createGovernanceRule: (input: GovernanceRuleInput, cellId?: CellId) => Promise<boolean>;
  checkRuleDataConstraints: (
    input: CheckRuleDataConstraintsInput,
    cellId?: CellId
  ) => Promise<ConstraintViolation[]>;
  selectResourceSpecification: (specification: ResourceSpecification) => void;
  selectEconomicResource: (resource: EconomicResource) => void;
  clearSelections: () => void;
  clearError: () => void;
  initialize: () => Promise<void>;
};

// ─── Store factory ─────────────────────────────────────────────────────────────

const createResourceStore = (): E.Effect<ResourceStore, never, ResourceServiceTag> =>
  E.gen(function* () {
    const resourceService: ResourceService = yield* ResourceServiceTag;

    // ─── Reactive state ──────────────────────────────────────────────────────
    let isLoading: boolean = $state(false);
    let errorMessage: string | null = $state(null);
    let allResourceSpecifications: ResourceSpecification[] = $state([]);
    let resourceSpecificationListings: ResourceSpecificationListing[] = $state([]);
    let specificationsByNdo: Map<string, ResourceSpecificationListing[]> = $state(new Map());
    // TODO: allEconomicResources is never populated — no store method writes to it.
    // Either wire fetchAllEconomicResources here or remove this getter from the public type before
    // connecting UI components so consumers are not misled by an always-empty array.
    const allEconomicResources: EconomicResource[] = $state([]);
    let myResources: EconomicResource[] = $state([]);
    let selectedSpecification: ResourceSpecification | null = $state(null);
    let selectedResource: EconomicResource | null = $state(null);

    const specificationCache: Map<string, ResourceSpecification> = $state(new Map());
    const resourceCache: Map<string, EconomicResource> = $state(new Map());
    const resourcesByCustodian: Map<string, EconomicResource[]> = $state(new Map());

    // ─── Loading state setters ────────────────────────────────────────────────
    const setters = createLoadingStateSetter(
      (v) => { isLoading = v; },
      (v) => { errorMessage = v; }
    );

    // ─── Internal run helper ──────────────────────────────────────────────────
    async function run<T>(effect: E.Effect<T, unknown>): Promise<T | null> {
      const exit = await E.runPromiseExit(withLoadingState(() => effect)(setters));
      return Exit.isSuccess(exit) ? exit.value : null;
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    async function createResourceSpecification(
      specData: ResourceSpecificationInput,
      cellId?: CellId
    ): Promise<CreateResourceSpecificationOutput | null> {
      const out = await run(resourceService.createResourceSpecification(specData, cellId));
      if (out) {
        // The global anchor lives in whichever DHT the spec was written to.
        // For a per-NDO cell it is that cell's anchor, so the shared-cell
        // listing is not refreshed and must not be clobbered with it.
        if (!cellId) await fetchAllResourceSpecifications();
        await fetchSpecificationsForNdo(specData.ndo_identity_hash, cellId);
      }
      return out;
    }

    async function fetchAllResourceSpecifications(): Promise<void> {
      const listings = await run(resourceService.getAllResourceSpecifications());
      if (listings) {
        resourceSpecificationListings = listings;
        allResourceSpecifications = listings.map((l) => l.specification);
        listings.forEach((listing) => {
          specificationCache.set(listing.action_hash.toString(), listing.specification);
          specificationCache.set(
            `${listing.specification.name}-${listing.specification.category ?? ''}`,
            listing.specification
          );
        });
      }
    }

    async function fetchSpecificationsForNdo(
      ndoHash: ActionHash,
      cellId?: CellId
    ): Promise<ResourceSpecificationListing[]> {
      const listings = await run(resourceService.getSpecificationsForNdo(ndoHash, cellId));
      const key = ndoHash.toString();
      if (listings) {
        specificationsByNdo.set(key, listings);
        listings.forEach((listing) => {
          specificationCache.set(listing.action_hash.toString(), listing.specification);
        });
        return listings;
      }
      return specificationsByNdo.get(key) ?? [];
    }

    async function fetchResourceSpecification(
      hash: ActionHash
    ): Promise<ResourceSpecification | null> {
      const specification = await run(resourceService.getResourceSpecification(hash));
      if (specification) specificationCache.set(hash.toString(), specification);
      return specification;
    }

    async function createEconomicResource(
      resourceData: Omit<EconomicResource, 'created_at'>
    ): Promise<ActionHash | null> {
      const hash = await run(resourceService.createEconomicResource(resourceData));
      if (hash) await fetchResourcesByCustodian(resourceData.custodian);
      return hash;
    }

    async function fetchEconomicResource(hash: ActionHash): Promise<EconomicResource | null> {
      const resource = await run(resourceService.getEconomicResource(hash));
      if (resource) resourceCache.set(hash.toString(), resource);
      return resource;
    }

    async function fetchResourcesByCustodian(custodian: AgentPubKey): Promise<EconomicResource[]> {
      const exit = await E.runPromiseExit(resourceService.getResourcesByCustodian(custodian));
      if (Exit.isSuccess(exit)) {
        resourcesByCustodian.set(custodian.toString(), exit.value);
        return exit.value;
      }
      return [];
    }

    async function fetchMyResources(myAgentPubKey: AgentPubKey): Promise<void> {
      const resources = await run(resourceService.getResourcesByCustodian(myAgentPubKey));
      if (resources) {
        resourcesByCustodian.set(myAgentPubKey.toString(), resources);
        myResources = resources;
      }
    }

    async function transferResourceCustody(
      resourceHash: ActionHash,
      newCustodian: AgentPubKey
    ): Promise<ActionHash | null> {
      const hash = await run(resourceService.transferResourceCustody(resourceHash, newCustodian));
      if (hash) {
        await fetchResourcesByCustodian(newCustodian);
        const updated = await fetchEconomicResource(resourceHash);
        if (updated) updated.custodian = newCustodian;
      }
      return hash;
    }

    async function updateResourceQuantity(
      resourceHash: ActionHash,
      newQuantity: number
    ): Promise<ActionHash | null> {
      const hash = await run(resourceService.updateResourceQuantity(resourceHash, newQuantity));
      if (hash) {
        const updated = await fetchEconomicResource(resourceHash);
        if (updated) updated.quantity = newQuantity;
      }
      return hash;
    }

    async function searchResourcesBySpecification(
      specificationHash: EntryHash
    ): Promise<EconomicResource[]> {
      const exit = await E.runPromiseExit(
        resourceService.searchResourcesBySpecification(specificationHash)
      );
      return Exit.isSuccess(exit) ? exit.value : [];
    }

    async function getResourceHistory(resourceHash: ActionHash): Promise<EconomicResource[]> {
      const exit = await E.runPromiseExit(resourceService.getResourceHistory(resourceHash));
      return Exit.isSuccess(exit) ? exit.value : [];
    }

    async function updateResourceSpecification(
      hash: ActionHash,
      updatedSpec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
    ): Promise<ActionHash | null> {
      const updateHash = await run(
        resourceService.updateResourceSpecification(hash, updatedSpec)
      );
      if (updateHash) await fetchAllResourceSpecifications();
      return updateHash;
    }

    async function deleteResourceSpecification(hash: ActionHash): Promise<ActionHash | null> {
      const deleteHash = await run(resourceService.deleteResourceSpecification(hash));
      if (deleteHash) await fetchAllResourceSpecifications();
      return deleteHash;
    }

    async function archiveEconomicResource(hash: ActionHash): Promise<ActionHash | null> {
      const archiveHash = await run(resourceService.archiveEconomicResource(hash));
      if (archiveHash) resourceCache.delete(hash.toString());
      return archiveHash;
    }

    async function createGovernanceRule(
      input: GovernanceRuleInput,
      cellId?: CellId
    ): Promise<boolean> {
      const record = await run(resourceService.createGovernanceRule(input, cellId));
      return record != null;
    }

    async function checkRuleDataConstraints(
      input: CheckRuleDataConstraintsInput,
      cellId?: CellId
    ): Promise<ConstraintViolation[]> {
      const exit = await E.runPromiseExit(
        resourceService.checkRuleDataConstraints(input, cellId)
      );
      return Exit.isSuccess(exit) ? exit.value : [];
    }

    function selectResourceSpecification(specification: ResourceSpecification) {
      selectedSpecification = specification;
    }
    function selectEconomicResource(resource: EconomicResource) { selectedResource = resource; }
    function clearSelections() { selectedSpecification = null; selectedResource = null; }
    function clearError() { errorMessage = null; }
    async function initialize() { await fetchAllResourceSpecifications(); }

    return {
      get isLoading() { return isLoading; },
      get errorMessage() { return errorMessage; },
      get allResourceSpecifications() { return allResourceSpecifications; },
      get resourceSpecificationListings() { return resourceSpecificationListings; },
      get specificationsByNdo() { return specificationsByNdo; },
      get allEconomicResources() { return allEconomicResources; },
      get myResources() { return myResources; },
      get selectedSpecification() { return selectedSpecification; },
      get selectedResource() { return selectedResource; },
      get resourcesByCustodian() { return resourcesByCustodian; },

      createResourceSpecification,
      fetchAllResourceSpecifications,
      fetchSpecificationsForNdo,
      fetchResourceSpecification,
      createEconomicResource,
      fetchEconomicResource,
      fetchResourcesByCustodian,
      fetchMyResources,
      transferResourceCustody,
      updateResourceQuantity,
      searchResourcesBySpecification,
      getResourceHistory,
      updateResourceSpecification,
      deleteResourceSpecification,
      archiveEconomicResource,
      createGovernanceRule,
      checkRuleDataConstraints,
      selectResourceSpecification,
      selectEconomicResource,
      clearSelections,
      clearError,
      initialize
    };
  });

// ─── Store instance ────────────────────────────────────────────────────────────

export const resourceStore: ResourceStore = pipe(
  createResourceStore(),
  E.provide(ResourceServiceResolved),
  E.runSync
);

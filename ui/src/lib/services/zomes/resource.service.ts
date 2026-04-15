import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { ResourceError } from '$lib/errors/resource.errors';
import { RESOURCE_CONTEXTS } from '$lib/errors/error-contexts';
import type { ResourceSpecification, EconomicResource } from '@nondominium/shared-types';

// ─── Service interface ────────────────────────────────────────────────────────

export interface ResourceService {
  createResourceSpecification: (
    spec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ) => E.Effect<ActionHash, ResourceError>;
  getResourceSpecification: (hash: ActionHash) => E.Effect<ResourceSpecification, ResourceError>;
  getAllResourceSpecifications: () => E.Effect<ResourceSpecification[], ResourceError>;
  createEconomicResource: (
    resource: Omit<EconomicResource, 'created_at'>
  ) => E.Effect<ActionHash, ResourceError>;
  getEconomicResource: (hash: ActionHash) => E.Effect<EconomicResource, ResourceError>;
  getResourcesByCustodian: (
    custodian: AgentPubKey
  ) => E.Effect<EconomicResource[], ResourceError>;
  updateResourceSpecification: (
    hash: ActionHash,
    updatedSpec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ) => E.Effect<ActionHash, ResourceError>;
  transferResourceCustody: (
    resourceHash: ActionHash,
    newCustodian: AgentPubKey
  ) => E.Effect<ActionHash, ResourceError>;
  updateResourceQuantity: (
    resourceHash: ActionHash,
    newQuantity: number
  ) => E.Effect<ActionHash, ResourceError>;
  searchResourcesBySpecification: (
    specificationHash: EntryHash
  ) => E.Effect<EconomicResource[], ResourceError>;
  getResourceHistory: (resourceHash: ActionHash) => E.Effect<EconomicResource[], ResourceError>;
  deleteResourceSpecification: (hash: ActionHash) => E.Effect<ActionHash, ResourceError>;
  archiveEconomicResource: (hash: ActionHash) => E.Effect<ActionHash, ResourceError>;
}

// ─── Context Tag ─────────────────────────────────────────────────────────────

export class ResourceServiceTag extends Context.Tag('ResourceService')<
  ResourceServiceTag,
  ResourceService
>() {}

// ─── Live Layer ───────────────────────────────────────────────────────────────

export const ResourceServiceLive: Layer.Layer<
  ResourceServiceTag,
  never,
  HolochainClientServiceTag
> = Layer.effect(
  ResourceServiceTag,
  E.gen(function* () {
    const holochainClient = yield* HolochainClientServiceTag;

    const wz = <T>(
      fnName: string,
      payload: unknown,
      context: string
    ): E.Effect<T, ResourceError> =>
      wrapZomeCallWithErrorFactory<T, ResourceError>(
        holochainClient,
        'zome_resource',
        fnName,
        payload,
        context,
        ResourceError.fromError
      );

    return {
      createResourceSpecification: (spec) =>
        wz<ActionHash>(
          'create_resource_specification',
          spec,
          RESOURCE_CONTEXTS.CREATE_RESOURCE_SPECIFICATION
        ),

      getResourceSpecification: (hash) =>
        wz<ResourceSpecification>(
          'get_resource_specification',
          hash,
          RESOURCE_CONTEXTS.GET_RESOURCE_SPECIFICATION
        ),

      getAllResourceSpecifications: () =>
        wz<ResourceSpecification[]>(
          'get_all_resource_specifications',
          null,
          RESOURCE_CONTEXTS.GET_ALL_RESOURCE_SPECIFICATIONS
        ),

      createEconomicResource: (resource) =>
        wz<ActionHash>(
          'create_economic_resource',
          resource,
          RESOURCE_CONTEXTS.CREATE_ECONOMIC_RESOURCE
        ),

      getEconomicResource: (hash) =>
        wz<EconomicResource>(
          'get_economic_resource',
          hash,
          RESOURCE_CONTEXTS.GET_ECONOMIC_RESOURCE
        ),

      getResourcesByCustodian: (custodian) =>
        wz<EconomicResource[]>(
          'get_resources_by_custodian',
          custodian,
          RESOURCE_CONTEXTS.GET_RESOURCES_BY_CUSTODIAN
        ),

      updateResourceSpecification: (hash, updatedSpec) =>
        wz<ActionHash>(
          'update_resource_specification',
          { hash, specification: updatedSpec },
          RESOURCE_CONTEXTS.UPDATE_RESOURCE_SPECIFICATION
        ),

      transferResourceCustody: (resourceHash, newCustodian) =>
        wz<ActionHash>(
          'transfer_resource_custody',
          { resource_hash: resourceHash, new_custodian: newCustodian },
          RESOURCE_CONTEXTS.TRANSFER_RESOURCE_CUSTODY
        ),

      updateResourceQuantity: (resourceHash, newQuantity) =>
        wz<ActionHash>(
          'update_resource_quantity',
          { resource_hash: resourceHash, new_quantity: newQuantity },
          RESOURCE_CONTEXTS.UPDATE_RESOURCE_QUANTITY
        ),

      searchResourcesBySpecification: (specificationHash) =>
        wz<EconomicResource[]>(
          'search_resources_by_specification',
          specificationHash,
          RESOURCE_CONTEXTS.SEARCH_RESOURCES_BY_SPECIFICATION
        ),

      getResourceHistory: (resourceHash) =>
        wz<EconomicResource[]>(
          'get_resource_history',
          resourceHash,
          RESOURCE_CONTEXTS.GET_RESOURCE_HISTORY
        ),

      deleteResourceSpecification: (hash) =>
        wz<ActionHash>(
          'delete_resource_specification',
          hash,
          RESOURCE_CONTEXTS.DELETE_RESOURCE_SPECIFICATION
        ),

      archiveEconomicResource: (hash) =>
        wz<ActionHash>(
          'archive_economic_resource',
          hash,
          RESOURCE_CONTEXTS.ARCHIVE_ECONOMIC_RESOURCE
        )
    } satisfies ResourceService;
  })
);

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const ResourceServiceResolved: Layer.Layer<ResourceServiceTag> = ResourceServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);

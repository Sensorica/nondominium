import { Effect as E } from 'effect';
import type { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';
import holochainService from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { ResourceError } from '$lib/errors/resource.errors';
import { RESOURCE_CONTEXTS } from '$lib/errors/error-contexts';
import type { ResourceSpecification, EconomicResource } from '@nondominium/shared-types';

// ─── Helper ──────────────────────────────────────────────────────────────────

const wz = <T>(fnName: string, payload: unknown, context: string): E.Effect<T, ResourceError> =>
  wrapZomeCallWithErrorFactory<T, ResourceError>(
    holochainService,
    'zome_resource',
    fnName,
    payload,
    context,
    ResourceError.fromError
  );

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

// ─── Implementation ───────────────────────────────────────────────────────────

export const resourceService: ResourceService = {
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
    wz<EconomicResource>('get_economic_resource', hash, RESOURCE_CONTEXTS.GET_ECONOMIC_RESOURCE),

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
    wrapZomeCallWithErrorFactory<ActionHash, ResourceError>(
      holochainService,
      'zome_resource',
      'transfer_resource_custody',
      { resource_hash: resourceHash, new_custodian: newCustodian },
      RESOURCE_CONTEXTS.TRANSFER_RESOURCE_CUSTODY,
      ResourceError.fromError
    ),

  updateResourceQuantity: (resourceHash, newQuantity) =>
    wrapZomeCallWithErrorFactory<ActionHash, ResourceError>(
      holochainService,
      'zome_resource',
      'update_resource_quantity',
      { resource_hash: resourceHash, new_quantity: newQuantity },
      RESOURCE_CONTEXTS.UPDATE_ECONOMIC_RESOURCE,
      ResourceError.fromError
    ),

  searchResourcesBySpecification: (specificationHash) =>
    wrapZomeCallWithErrorFactory<EconomicResource[], ResourceError>(
      holochainService,
      'zome_resource',
      'search_resources_by_specification',
      specificationHash,
      RESOURCE_CONTEXTS.GET_ALL_ECONOMIC_RESOURCES,
      ResourceError.fromError
    ),

  getResourceHistory: (resourceHash) =>
    wrapZomeCallWithErrorFactory<EconomicResource[], ResourceError>(
      holochainService,
      'zome_resource',
      'get_resource_history',
      resourceHash,
      RESOURCE_CONTEXTS.GET_ECONOMIC_RESOURCE,
      ResourceError.fromError
    ),

  deleteResourceSpecification: (hash) =>
    wrapZomeCallWithErrorFactory<ActionHash, ResourceError>(
      holochainService,
      'zome_resource',
      'delete_resource_specification',
      hash,
      RESOURCE_CONTEXTS.DELETE_RESOURCE_SPECIFICATION,
      ResourceError.fromError
    ),

  archiveEconomicResource: (hash) =>
    wrapZomeCallWithErrorFactory<ActionHash, ResourceError>(
      holochainService,
      'zome_resource',
      'archive_economic_resource',
      hash,
      RESOURCE_CONTEXTS.UPDATE_ECONOMIC_RESOURCE,
      ResourceError.fromError
    )
};

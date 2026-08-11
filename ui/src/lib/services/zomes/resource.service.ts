import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { wrapZomeCallWithErrorFactory } from '$lib/utils/zome-helpers';
import { ResourceError } from '$lib/errors/resource.errors';
import { RESOURCE_CONTEXTS } from '$lib/errors/error-contexts';
import type {
  ResourceSpecification,
  EconomicResource,
  GetAllResourceSpecificationsOutput,
  ResourceSpecificationListing,
  ResourceSpecificationInput,
  CreateResourceSpecificationOutput,
  GetResourceSpecWithRulesOutput,
  GetAllNdosOutput,
  NdoInput,
  NdoOutput,
  NondominiumIdentity,
  UpdateLifecycleStageInput,
  NdoTransitionHistoryEvent,
  LifecycleStage,
  ResourceNature,
  PropertyRegime,
  OperationalState,
  GovernanceRuleInput,
  CheckRuleDataConstraintsInput,
  ConstraintViolation
} from '@nondominium/shared-types';
import type { Record as HoloRecord } from '@holochain/client';
import {
  economicResourceRowsFromRecords,
  type EconomicResourceRow
} from '$lib/utils/holochain-records';

function listingsFromOutput(
  out: GetAllResourceSpecificationsOutput,
  context: string
): E.Effect<ResourceSpecificationListing[], ResourceError> {
  const { specifications, action_hashes } = out;
  if (!action_hashes || action_hashes.length !== specifications.length) {
    return E.fail(
      ResourceError.create(
        `${context}: action_hashes missing or length mismatch`,
        context
      )
    );
  }
  const listings: ResourceSpecificationListing[] = specifications.map(
    (specification: ResourceSpecification, i: number) => ({
      action_hash: action_hashes[i],
      specification
    })
  );
  return E.succeed(listings);
}

// ─── Service interface ────────────────────────────────────────────────────────

export interface ResourceService {
  createResourceSpecification: (
    spec: ResourceSpecificationInput
  ) => E.Effect<CreateResourceSpecificationOutput, ResourceError>;
  getResourceSpecification: (hash: ActionHash) => E.Effect<ResourceSpecification, ResourceError>;
  getAllResourceSpecifications: () => E.Effect<ResourceSpecificationListing[], ResourceError>;
  getSpecificationsForNdo: (
    ndoHash: ActionHash
  ) => E.Effect<ResourceSpecificationListing[], ResourceError>;
  getResourceSpecificationWithRules: (
    specHash: ActionHash
  ) => E.Effect<GetResourceSpecWithRulesOutput, ResourceError>;
  getResourcesBySpecification: (specHash: ActionHash) => E.Effect<EconomicResourceRow[], ResourceError>;
  getAllNdos: () => E.Effect<GetAllNdosOutput, ResourceError>;
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
  createNdo: (input: NdoInput) => E.Effect<NdoOutput, ResourceError>;
  getNdo: (hash: ActionHash) => E.Effect<NondominiumIdentity | null, ResourceError>;
  updateLifecycleStage: (input: UpdateLifecycleStageInput) => E.Effect<ActionHash, ResourceError>;
  getMyNdos: () => E.Effect<GetAllNdosOutput, ResourceError>;
  getNdosByLifecycleStage: (stage: LifecycleStage) => E.Effect<GetAllNdosOutput, ResourceError>;
  getNdosByNature: (nature: ResourceNature) => E.Effect<GetAllNdosOutput, ResourceError>;
  getNdosByPropertyRegime: (regime: PropertyRegime) => E.Effect<GetAllNdosOutput, ResourceError>;
  getNdoTransitionHistory: (ndoHash: ActionHash) => E.Effect<NdoTransitionHistoryEvent[], ResourceError>;
  updateOperationalState: (
    resourceHash: ActionHash,
    newOperationalState: OperationalState
  ) => E.Effect<HoloRecord, ResourceError>;
  getResourcesByOperationalState: (
    state: OperationalState
  ) => E.Effect<EconomicResourceRow[], ResourceError>;
  createGovernanceRule: (input: GovernanceRuleInput) => E.Effect<HoloRecord, ResourceError>;
  checkRuleDataConstraints: (
    input: CheckRuleDataConstraintsInput
  ) => E.Effect<ConstraintViolation[], ResourceError>;
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
        wz<CreateResourceSpecificationOutput>(
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
        wz<GetAllResourceSpecificationsOutput>(
          'get_all_resource_specifications',
          null,
          RESOURCE_CONTEXTS.GET_ALL_RESOURCE_SPECIFICATIONS
        ).pipe(
          E.flatMap((out) =>
            listingsFromOutput(out, RESOURCE_CONTEXTS.GET_ALL_RESOURCE_SPECIFICATIONS)
          )
        ),

      getSpecificationsForNdo: (ndoHash) =>
        wz<GetAllResourceSpecificationsOutput>(
          'get_specifications_for_ndo',
          ndoHash,
          RESOURCE_CONTEXTS.GET_SPECIFICATIONS_FOR_NDO
        ).pipe(
          E.flatMap((out) => listingsFromOutput(out, RESOURCE_CONTEXTS.GET_SPECIFICATIONS_FOR_NDO))
        ),

      getResourceSpecificationWithRules: (specHash) =>
        wz<GetResourceSpecWithRulesOutput>(
          'get_resource_specification_with_rules',
          specHash,
          RESOURCE_CONTEXTS.GET_RESOURCE_SPECIFICATION_WITH_RULES
        ),

      getResourcesBySpecification: (specHash) =>
        wz<HoloRecord[]>(
          'get_resources_by_specification',
          specHash,
          RESOURCE_CONTEXTS.GET_RESOURCES_BY_SPECIFICATION
        ).pipe(E.map(economicResourceRowsFromRecords)),

      getAllNdos: () =>
        wz<GetAllNdosOutput>('get_all_ndos', null, RESOURCE_CONTEXTS.GET_ALL_NDOS),

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
        ),

      createNdo: (input) =>
        wz<NdoOutput>('create_ndo', input, RESOURCE_CONTEXTS.CREATE_NDO),

      getNdo: (hash) =>
        wz<NondominiumIdentity | null>('get_ndo', hash, RESOURCE_CONTEXTS.GET_NDO),

      updateLifecycleStage: (input) =>
        wz<ActionHash>('update_lifecycle_stage', input, RESOURCE_CONTEXTS.UPDATE_LIFECYCLE_STAGE),

      getMyNdos: () =>
        wz<GetAllNdosOutput>('get_my_ndos', null, RESOURCE_CONTEXTS.GET_MY_NDOS),

      getNdosByLifecycleStage: (stage) =>
        wz<GetAllNdosOutput>(
          'get_ndos_by_lifecycle_stage',
          stage,
          RESOURCE_CONTEXTS.GET_NDOS_BY_LIFECYCLE_STAGE
        ),

      getNdosByNature: (nature) =>
        wz<GetAllNdosOutput>(
          'get_ndos_by_nature',
          nature,
          RESOURCE_CONTEXTS.GET_NDOS_BY_NATURE
        ),

      getNdosByPropertyRegime: (regime) =>
        wz<GetAllNdosOutput>(
          'get_ndos_by_property_regime',
          regime,
          RESOURCE_CONTEXTS.GET_NDOS_BY_PROPERTY_REGIME
        ),

      getNdoTransitionHistory: (ndoHash) =>
        wz<NdoTransitionHistoryEvent[]>(
          'get_ndo_transition_history',
          ndoHash,
          RESOURCE_CONTEXTS.GET_NDO_TRANSITION_HISTORY
        ).pipe(E.catchAll(() => E.succeed([]))),

      updateOperationalState: (resourceHash, newOperationalState) =>
        wz<HoloRecord>(
          'update_operational_state',
          { resource_hash: resourceHash, new_operational_state: newOperationalState },
          RESOURCE_CONTEXTS.UPDATE_OPERATIONAL_STATE
        ),

      getResourcesByOperationalState: (state) =>
        wz<HoloRecord[]>(
          'get_resources_by_operational_state',
          state,
          RESOURCE_CONTEXTS.GET_RESOURCES_BY_OPERATIONAL_STATE
        ).pipe(E.map(economicResourceRowsFromRecords)),

      createGovernanceRule: (input) =>
        wz<HoloRecord>(
          'create_governance_rule',
          input,
          RESOURCE_CONTEXTS.CREATE_GOVERNANCE_RULE
        ),

      checkRuleDataConstraints: (input) =>
        wz<ConstraintViolation[]>(
          'check_rule_data_constraints',
          input,
          RESOURCE_CONTEXTS.CHECK_RULE_DATA_CONSTRAINTS
        )
    } satisfies ResourceService;
  })
);

/** Fully-resolved layer for direct use (no further dependencies needed). */
export const ResourceServiceResolved: Layer.Layer<ResourceServiceTag> = ResourceServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);

import type { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';
import { resourceService } from '../services/zomes/resource.service.js';
import type { ResourceSpecification, EconomicResource } from '@nondominium/shared-types';

export type ResourceLoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Resource store using Svelte 5 runes
 * Clean architecture following requests-and-offers patterns (without Effect)
 */
function createResourceStore() {
  // Loading states
  let loadingState: ResourceLoadingState = $state('idle');
  let error: Error | null = $state(null);

  // Data stores
  let allResourceSpecifications: ResourceSpecification[] = $state([]);
  const allEconomicResources: EconomicResource[] = $state([]);
  let myResources: EconomicResource[] = $state([]); // Resources I'm custodian of
  let selectedSpecification: ResourceSpecification | null = $state(null);
  let selectedResource: EconomicResource | null = $state(null);

  // Cache for resources and specifications
  const specificationCache: Map<string, ResourceSpecification> = $state(new Map());
  const resourceCache: Map<string, EconomicResource> = $state(new Map());
  const resourcesByCustodian: Map<string, EconomicResource[]> = $state(new Map());

  /**
   * Set loading state and error handling
   */
  function setLoadingState(state: ResourceLoadingState, errorMsg?: Error) {
    loadingState = state;
    error = errorMsg || null;
  }

  /**
   * Create a new resource specification
   */
  async function createResourceSpecification(
    specData: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await resourceService.createResourceSpecification(specData);

      // Refresh the specifications list
      await fetchAllResourceSpecifications();

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Fetch all resource specifications
   */
  async function fetchAllResourceSpecifications(): Promise<void> {
    setLoadingState('loading');

    try {
      const specifications = await resourceService.getAllResourceSpecifications();
      allResourceSpecifications = specifications;

      // Update cache
      specifications.forEach((spec) => {
        // TODO: We need the hash to use as cache key
        // For now, we'll use a combination of name and created_by
        const cacheKey = `${spec.name}-${spec.created_by.toString()}`;
        specificationCache.set(cacheKey, spec);
      });

      setLoadingState('success');
    } catch (err) {
      setLoadingState('error', err as Error);
    }
  }

  /**
   * Get a specific resource specification by hash
   */
  async function fetchResourceSpecification(
    hash: ActionHash
  ): Promise<ResourceSpecification | null> {
    setLoadingState('loading');

    try {
      const specification = await resourceService.getResourceSpecification(hash);

      // Update cache
      const cacheKey = hash.toString();
      specificationCache.set(cacheKey, specification);

      setLoadingState('success');
      return specification;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Create a new economic resource instance
   */
  async function createEconomicResource(
    resourceData: Omit<EconomicResource, 'created_at'>
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await resourceService.createEconomicResource(resourceData);

      // Refresh resources
      await fetchResourcesByCustodian(resourceData.custodian);

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Fetch an economic resource by hash
   */
  async function fetchEconomicResource(hash: ActionHash): Promise<EconomicResource | null> {
    setLoadingState('loading');

    try {
      const resource = await resourceService.getEconomicResource(hash);

      // Update cache
      const cacheKey = hash.toString();
      resourceCache.set(cacheKey, resource);

      setLoadingState('success');
      return resource;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Fetch resources by custodian
   */
  async function fetchResourcesByCustodian(custodian: AgentPubKey): Promise<EconomicResource[]> {
    const custodianKey = custodian.toString();

    try {
      const resources = await resourceService.getResourcesByCustodian(custodian);

      // Update cache
      resourcesByCustodian.set(custodianKey, resources);
      resources.forEach((resource) => {
        // TODO: We need the hash to use as cache key
        const cacheKey = `${resource.custodian.toString()}-${Date.now()}`;
        resourceCache.set(cacheKey, resource);
      });

      return resources;
    } catch (err) {
      console.error('Failed to fetch resources by custodian:', err);
      return [];
    }
  }

  /**
   * Fetch my resources (resources I'm custodian of)
   */
  async function fetchMyResources(myAgentPubKey: AgentPubKey): Promise<void> {
    setLoadingState('loading');

    try {
      const resources = await fetchResourcesByCustodian(myAgentPubKey);
      myResources = resources;
      setLoadingState('success');
    } catch (err) {
      setLoadingState('error', err as Error);
    }
  }

  /**
   * Transfer custody of a resource
   */
  async function transferResourceCustody(
    resourceHash: ActionHash,
    newCustodian: AgentPubKey
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await resourceService.transferResourceCustody(resourceHash, newCustodian);

      // Refresh affected custodian's resources
      await fetchResourcesByCustodian(newCustodian);

      // Update the resource in cache
      const resource = await fetchEconomicResource(resourceHash);
      if (resource) {
        resource.custodian = newCustodian;
      }

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Update resource quantity
   */
  async function updateResourceQuantity(
    resourceHash: ActionHash,
    newQuantity: number
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const hash = await resourceService.updateResourceQuantity(resourceHash, newQuantity);

      // Update the resource in cache
      const resource = await fetchEconomicResource(resourceHash);
      if (resource) {
        resource.quantity = newQuantity;
      }

      setLoadingState('success');
      return hash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Search resources by specification
   */
  async function searchResourcesBySpecification(
    specificationHash: EntryHash
  ): Promise<EconomicResource[]> {
    try {
      return await resourceService.searchResourcesBySpecification(specificationHash);
    } catch (err) {
      console.error('Failed to search resources by specification:', err);
      return [];
    }
  }

  /**
   * Get resource history
   */
  async function getResourceHistory(resourceHash: ActionHash): Promise<EconomicResource[]> {
    try {
      return await resourceService.getResourceHistory(resourceHash);
    } catch (err) {
      console.error('Failed to get resource history:', err);
      return [];
    }
  }

  /**
   * Update a resource specification
   */
  async function updateResourceSpecification(
    hash: ActionHash,
    updatedSpec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const updateHash = await resourceService.updateResourceSpecification(hash, updatedSpec);

      // Refresh specifications
      await fetchAllResourceSpecifications();

      setLoadingState('success');
      return updateHash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Delete/archive a resource specification
   */
  async function deleteResourceSpecification(hash: ActionHash): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const deleteHash = await resourceService.deleteResourceSpecification(hash);

      // Refresh specifications
      await fetchAllResourceSpecifications();

      setLoadingState('success');
      return deleteHash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Archive an economic resource
   */
  async function archiveEconomicResource(hash: ActionHash): Promise<ActionHash | null> {
    setLoadingState('loading');

    try {
      const archiveHash = await resourceService.archiveEconomicResource(hash);

      // Remove from cache and refresh
      resourceCache.delete(hash.toString());

      setLoadingState('success');
      return archiveHash;
    } catch (err) {
      setLoadingState('error', err as Error);
      return null;
    }
  }

  /**
   * Select a resource specification for detailed view
   */
  function selectResourceSpecification(specification: ResourceSpecification) {
    selectedSpecification = specification;
  }

  /**
   * Select an economic resource for detailed view
   */
  function selectEconomicResource(resource: EconomicResource) {
    selectedResource = resource;
  }

  /**
   * Clear selections
   */
  function clearSelections() {
    selectedSpecification = null;
    selectedResource = null;
  }

  /**
   * Clear error state
   */
  function clearError() {
    error = null;
    if (loadingState === 'error') {
      loadingState = 'idle';
    }
  }

  /**
   * Initialize the store
   */
  async function initialize() {
    await fetchAllResourceSpecifications();
  }

  return {
    // Reactive getters
    get loadingState() {
      return loadingState;
    },
    get error() {
      return error;
    },
    get allResourceSpecifications() {
      return allResourceSpecifications;
    },
    get allEconomicResources() {
      return allEconomicResources;
    },
    get myResources() {
      return myResources;
    },
    get selectedSpecification() {
      return selectedSpecification;
    },
    get selectedResource() {
      return selectedResource;
    },
    get resourcesByCustodian() {
      return resourcesByCustodian;
    },

    // Actions
    createResourceSpecification,
    fetchAllResourceSpecifications,
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
    selectResourceSpecification,
    selectEconomicResource,
    clearSelections,
    clearError,
    initialize
  };
}

// Export singleton instance
export const resourceStore = createResourceStore();

// Export type
export type ResourceStore = ReturnType<typeof createResourceStore>;

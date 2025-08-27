import type { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';
import holochainService from '../holochain.service.svelte.js';
import type { ResourceSpecification, EconomicResource } from '../../types/holochain.js';

/**
 * Resource zome service - clean architecture without Effect
 * Handles all resource-related operations (Phase 2)
 */
class ResourceService {
  /**
   * Create a new resource specification
   */
  async createResourceSpecification(
    spec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ): Promise<ActionHash> {
    try {
      return await holochainService.callZome(
        'zome_resource',
        'create_resource_specification',
        spec
      );
    } catch (error) {
      console.error('Failed to create resource specification:', error);
      throw error;
    }
  }

  /**
   * Get a resource specification by hash
   */
  async getResourceSpecification(hash: ActionHash): Promise<ResourceSpecification> {
    try {
      return await holochainService.callZome('zome_resource', 'get_resource_specification', hash);
    } catch (error) {
      console.error('Failed to get resource specification:', error);
      throw error;
    }
  }

  /**
   * Get all resource specifications for discovery
   */
  async getAllResourceSpecifications(): Promise<ResourceSpecification[]> {
    try {
      return await holochainService.callZome('zome_resource', 'get_all_resource_specifications');
    } catch (error) {
      console.error('Failed to get all resource specifications:', error);
      throw error;
    }
  }

  /**
   * Create a new economic resource instance
   */
  async createEconomicResource(
    resource: Omit<EconomicResource, 'created_at'>
  ): Promise<ActionHash> {
    try {
      return await holochainService.callZome('zome_resource', 'create_economic_resource', resource);
    } catch (error) {
      console.error('Failed to create economic resource:', error);
      throw error;
    }
  }

  /**
   * Get an economic resource by hash
   */
  async getEconomicResource(hash: ActionHash): Promise<EconomicResource> {
    try {
      return await holochainService.callZome('zome_resource', 'get_economic_resource', hash);
    } catch (error) {
      console.error('Failed to get economic resource:', error);
      throw error;
    }
  }

  /**
   * Get all resources managed by a specific custodian
   */
  async getResourcesByCustodian(custodian: AgentPubKey): Promise<EconomicResource[]> {
    try {
      return await holochainService.callZome(
        'zome_resource',
        'get_resources_by_custodian',
        custodian
      );
    } catch (error) {
      console.error('Failed to get resources by custodian:', error);
      throw error;
    }
  }

  /**
   * Update a resource specification
   */
  async updateResourceSpecification(
    hash: ActionHash,
    updatedSpec: Omit<ResourceSpecification, 'created_by' | 'created_at'>
  ): Promise<ActionHash> {
    try {
      return await holochainService.callZome('zome_resource', 'update_resource_specification', {
        hash,
        specification: updatedSpec
      });
    } catch (error) {
      console.error('Failed to update resource specification:', error);
      throw error;
    }
  }

  /**
   * Transfer custody of a resource to another agent
   */
  async transferResourceCustody(
    resourceHash: ActionHash,
    newCustodian: AgentPubKey
  ): Promise<ActionHash> {
    try {
      return await holochainService.callZome('zome_resource', 'transfer_resource_custody', {
        resource_hash: resourceHash,
        new_custodian: newCustodian
      });
    } catch (error) {
      console.error('Failed to transfer resource custody:', error);
      throw error;
    }
  }

  /**
   * Update resource quantity
   */
  async updateResourceQuantity(resourceHash: ActionHash, newQuantity: number): Promise<ActionHash> {
    try {
      return await holochainService.callZome('zome_resource', 'update_resource_quantity', {
        resource_hash: resourceHash,
        new_quantity: newQuantity
      });
    } catch (error) {
      console.error('Failed to update resource quantity:', error);
      throw error;
    }
  }

  /**
   * Search resources by specification type
   */
  async searchResourcesBySpecification(specificationHash: EntryHash): Promise<EconomicResource[]> {
    try {
      return await holochainService.callZome(
        'zome_resource',
        'search_resources_by_specification',
        specificationHash
      );
    } catch (error) {
      console.error('Failed to search resources by specification:', error);
      throw error;
    }
  }

  /**
   * Get resource history (all updates)
   */
  async getResourceHistory(resourceHash: ActionHash): Promise<EconomicResource[]> {
    try {
      return await holochainService.callZome('zome_resource', 'get_resource_history', resourceHash);
    } catch (error) {
      console.error('Failed to get resource history:', error);
      throw error;
    }
  }

  /**
   * Delete/archive a resource specification
   */
  async deleteResourceSpecification(hash: ActionHash): Promise<ActionHash> {
    try {
      return await holochainService.callZome(
        'zome_resource',
        'delete_resource_specification',
        hash
      );
    } catch (error) {
      console.error('Failed to delete resource specification:', error);
      throw error;
    }
  }

  /**
   * Archive an economic resource
   */
  async archiveEconomicResource(hash: ActionHash): Promise<ActionHash> {
    try {
      return await holochainService.callZome('zome_resource', 'archive_economic_resource', hash);
    } catch (error) {
      console.error('Failed to archive economic resource:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const resourceService = new ResourceService();

// Export class for testing
export { ResourceService };

import type { NdoDescriptor } from '@nondominium/shared-types';

/**
 * In-memory cache of NdoDescriptors keyed by their base64 action hash.
 * Populated when a user clicks an NDO card so the NDO detail page can
 * render immediately without waiting for a Holochain round-trip.
 */
export const ndoDescriptorCache = new Map<string, NdoDescriptor>();

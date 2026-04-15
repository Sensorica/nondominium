// Holochain service exports - clean architecture following requests-and-offers patterns
export { default as holochainService } from './holochain.service.svelte';
export type { HolochainClientService } from './holochain.service.svelte';
export type { ZomeName } from './holochain.service.svelte';
export {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from './holochain.service.svelte';

// Zome service tags and layers
export { PersonServiceTag, PersonServiceLive, PersonServiceResolved } from './zomes/person.service';
export { ResourceServiceTag, ResourceServiceLive, ResourceServiceResolved } from './zomes/resource.service';
export {
  GovernanceServiceTag,
  GovernanceServiceLive,
  GovernanceServiceResolved
} from './zomes/governance.service';

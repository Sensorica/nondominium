// Re-export all types from the shared types package

// Common Holochain types
export * from "./common.types.js";

// Person zome types
export * from "./person.types.js";

// Resource zome types
export * from "./resource.types.js";

// Governance zome types
export * from "./governance.types.js";

// PPR (Private Participation Receipt) types
export * from "./ppr.types.js";

// Complete Holochain App Interface
import type { PersonZomeFunctions } from "./person.types.js";
import type { ResourceZomeFunctions } from "./resource.types.js";
import type { GovernanceZomeFunctions } from "./governance.types.js";

export interface NondominiumApp {
  person: PersonZomeFunctions;
  resource: ResourceZomeFunctions;
  gouvernance: GovernanceZomeFunctions;
}

// Connection state
import type { AppClient } from "@holochain/client";

export interface HolochainConnectionState {
  client: AppClient | null;
  loading: boolean;
  error: Error | null;
  connected: boolean;
}

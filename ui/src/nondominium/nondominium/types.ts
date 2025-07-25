import type {
  ActionHash,
  AgentPubKey,
  Create,
  CreateLink,
  Delete,
  DeleteLink,
  DnaHash,
  EntryHash,
  ExternalHash,
  Record,
  SignedActionHashed,
  Update,
} from "@holochain/client";

export type nondominiumSignal =
  | {
      type: "EntryCreated";
      action: SignedActionHashed<Create>;
      app_entry: EntryTypes;
    }
  | {
      type: "EntryUpdated";
      action: SignedActionHashed<Update>;
      app_entry: EntryTypes;
      original_app_entry: EntryTypes;
    }
  | {
      type: "EntryDeleted";
      action: SignedActionHashed<Delete>;
      original_app_entry: EntryTypes;
    }
  | {
      type: "LinkCreated";
      action: SignedActionHashed<CreateLink>;
      link_type: string;
    }
  | {
      type: "LinkDeleted";
      action: SignedActionHashed<DeleteLink>;
      link_type: string;
    };

// ValueFlows Action enum matching the Rust implementation
export type VfAction =
  // Standard ValueFlows transfer actions
  | "Transfer" // Transfer ownership/custody
  | "Move" // Move a resource from one location to another

  // Standard ValueFlows production/consumption actions
  | "Use" // Use a resource without consuming it
  | "Consume" // Consume/destroy a resource
  | "Produce" // Create/produce a new resource
  | "Work" // Apply work/labor to a resource

  // Standard ValueFlows modification actions
  | "Modify" // Modify an existing resource
  | "Combine" // Combine multiple resources
  | "Separate" // Separate one resource into multiple

  // Standard ValueFlows quantity adjustment actions
  | "Raise" // Increase quantity/value of a resource
  | "Lower" // Decrease quantity/value of a resource

  // Standard ValueFlows citation/reference actions
  | "Cite" // Reference or cite a resource
  | "Accept" // Accept delivery or responsibility

  // nondominium-specific actions
  | "InitialTransfer" // First transfer by a Simple Agent
  | "AccessForUse" // Request access to use a resource
  | "TransferCustody"; // Transfer custody (nondominium specific)

export type EconomicEvent = {
  action: VfAction;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_inventoried_as: ActionHash;
  affects: ActionHash;
  resource_quantity: number;
  event_time: number;
  note?: string;
};

export type Commitment = {
  action: VfAction;
  provider: AgentPubKey;
  receiver: AgentPubKey;
  resource_inventoried_as?: ActionHash;
  resource_conforms_to?: ActionHash;
  input_of?: ActionHash;
  due_date: number;
  note?: string;
  committed_at: number;
};

export type ValidationReceipt = {
  validator: AgentPubKey;
  validated_item: ActionHash;
  validation_type: string;
  approved: boolean;
  notes?: string;
  validated_at: number;
};

export type EntryTypes = {
  EconomicEvent: EconomicEvent;
  Commitment: Commitment;
  ValidationReceipt: ValidationReceipt;
};

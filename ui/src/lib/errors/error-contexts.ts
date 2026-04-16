export const PERSON_CONTEXTS = {
  CREATE_PERSON: 'Failed to create person',
  GET_PERSON: 'Failed to get person',
  GET_ALL_PERSONS: 'Failed to get all persons',
  UPDATE_PERSON: 'Failed to update person',
  DELETE_PERSON: 'Failed to delete person',
  GET_MY_PROFILE: 'Failed to get my profile',
  CREATE_ENCRYPTED_PROFILE: 'Failed to create encrypted profile',
  GET_ENCRYPTED_PROFILE: 'Failed to get encrypted profile',
  ASSIGN_ROLE: 'Failed to assign role',
  GET_ROLES: 'Failed to get roles',
  GET_CAPABILITY_LEVEL: 'Failed to get capability level',
  HAS_ROLE_CAPABILITY: 'Failed to check role capability',
  REQUEST_ROLE_PROMOTION: 'Failed to request role promotion',
  APPROVE_ROLE_PROMOTION: 'Failed to approve role promotion',
  GET_ALL_ROLE_PROMOTION_REQUESTS: 'Failed to get role promotion requests',
  GRANT_PRIVATE_DATA_ACCESS: 'Failed to grant private data access',
  REVOKE_PRIVATE_DATA_ACCESS: 'Failed to revoke private data access',
  GET_MY_AGENT_PUB_KEY: 'Failed to get agent public key'
} as const;

export const RESOURCE_CONTEXTS = {
  CREATE_RESOURCE_SPECIFICATION: 'Failed to create resource specification',
  GET_RESOURCE_SPECIFICATION: 'Failed to get resource specification',
  GET_ALL_RESOURCE_SPECIFICATIONS: 'Failed to get all resource specifications',
  UPDATE_RESOURCE_SPECIFICATION: 'Failed to update resource specification',
  DELETE_RESOURCE_SPECIFICATION: 'Failed to delete resource specification',
  CREATE_ECONOMIC_RESOURCE: 'Failed to create economic resource',
  GET_ECONOMIC_RESOURCE: 'Failed to get economic resource',
  GET_ALL_ECONOMIC_RESOURCES: 'Failed to get all economic resources',
  GET_RESOURCES_BY_CUSTODIAN: 'Failed to get resources by custodian',
  UPDATE_ECONOMIC_RESOURCE: 'Failed to update economic resource',
  UPDATE_RESOURCE_QUANTITY: 'Failed to update resource quantity',
  SEARCH_RESOURCES_BY_SPECIFICATION: 'Failed to search resources by specification',
  GET_RESOURCE_HISTORY: 'Failed to get resource history',
  GET_RESOURCE_SPECIFICATION_WITH_RULES: 'Failed to get resource specification with governance rules',
  GET_RESOURCES_BY_SPECIFICATION: 'Failed to get economic resources for specification',
  GET_ALL_NDOS: 'Failed to get all NDO identities',
  ARCHIVE_ECONOMIC_RESOURCE: 'Failed to archive economic resource',
  TRANSFER_RESOURCE_CUSTODY: 'Failed to transfer resource custody',
  REQUEST_RESOURCE_TRANSITION: 'Failed to request resource state transition',
  CREATE_GOVERNANCE_RULE: 'Failed to create governance rule',
  GET_GOVERNANCE_RULES_FOR_SPEC: 'Failed to get governance rules for specification',
  CREATE_NDO_IDENTITY: 'Failed to create NDO identity',
  GET_NDO_IDENTITY: 'Failed to get NDO identity',
  GET_ALL_NDO_IDENTITIES: 'Failed to get all NDO identities',
  UPDATE_NDO_LIFECYCLE_STAGE: 'Failed to update NDO lifecycle stage'
} as const;

export const GOVERNANCE_CONTEXTS = {
  CREATE_COMMITMENT: 'Failed to create commitment',
  GET_COMMITMENT: 'Failed to get commitment',
  UPDATE_COMMITMENT: 'Failed to update commitment',
  GET_PENDING_COMMITMENTS: 'Failed to get pending commitments',
  GET_COMMITMENTS_BY_PROVIDER: 'Failed to get commitments by provider',
  GET_COMMITMENTS_BY_RECEIVER: 'Failed to get commitments by receiver',
  FULFILL_COMMITMENT: 'Failed to fulfill commitment',
  CANCEL_COMMITMENT: 'Failed to cancel commitment',
  CREATE_ECONOMIC_EVENT: 'Failed to create economic event',
  GET_ECONOMIC_EVENT: 'Failed to get economic event',
  GET_EVENTS_BY_AGENT: 'Failed to get events by agent',
  GET_EVENTS_FOR_RESOURCE: 'Failed to get events for resource',
  GET_ALL_ECONOMIC_EVENTS: 'Failed to get all economic events',
  GET_EVENTS_BY_TYPE: 'Failed to get events by type',
  GET_EVENTS_IN_TIME_RANGE: 'Failed to get events in time range',
  GET_RESOURCE_FLOW: 'Failed to get resource flow',
  CREATE_CLAIM: 'Failed to create claim',
  VALIDATE_NEW_RESOURCE: 'Failed to validate new resource',
  VALIDATE_AGENT_IDENTITY: 'Failed to validate agent identity',
  VALIDATE_SPECIALIZED_ROLE: 'Failed to validate specialized role',
  CREATE_RESOURCE_VALIDATION: 'Failed to create resource validation',
  CHECK_VALIDATION_STATUS: 'Failed to check validation status',
  GET_VALIDATION_HISTORY: 'Failed to get validation history',
  EVALUATE_STATE_TRANSITION: 'Failed to evaluate state transition',
  VALIDATE_GOVERNANCE_RULES: 'Failed to validate governance rules',
  LOG_INITIAL_TRANSFER: 'Failed to log initial transfer',
  CREATE_DISPUTE: 'Failed to create dispute',
  VOTE_ON_DISPUTE: 'Failed to vote on dispute'
} as const;

export const PPR_CONTEXTS = {
  ISSUE_PARTICIPATION_RECEIPTS: 'Failed to issue participation receipts',
  GET_MY_PPRS: 'Failed to get my participation claims',
  GET_REPUTATION_SUMMARY: 'Failed to get reputation summary',
  SIGN_PARTICIPATION_CLAIM: 'Failed to sign participation claim',
  VALIDATE_CLAIM_SIGNATURE: 'Failed to validate claim signature',
  GET_CLAIMS_BY_TYPE: 'Failed to get claims by type'
} as const;

export const WORKFLOW_CONTEXTS = {
  CUSTODY_TRANSFER: 'Custody transfer workflow failed',
  CUSTODY_TRANSFER_COMMITMENT: 'Failed to create custody transfer commitment',
  CUSTODY_TRANSFER_TRANSITION: 'Governance rejected custody transfer',
  CUSTODY_TRANSFER_CLAIM: 'Failed to create custody transfer claim',
  CUSTODY_TRANSFER_PPRS: 'Failed to issue custody transfer PPRs',
  AGENT_PROMOTION: 'Agent promotion workflow failed',
  AGENT_PROMOTION_REQUEST: 'Failed to request role promotion',
  AGENT_PROMOTION_VALIDATION: 'Governance rejected agent promotion',
  AGENT_PROMOTION_APPROVAL: 'Failed to approve role promotion',
  RESOURCE_VALIDATION: 'Resource validation workflow failed',
  ECONOMIC_PROCESS: 'Economic process workflow failed',
  ECONOMIC_PROCESS_ROLE_CHECK: 'Agent lacks required role for this process'
} as const;

export const HOLOCHAIN_CLIENT_CONTEXTS = {
  CONNECT: 'Failed to connect to Holochain',
  CALL_ZOME: 'Failed to call zome function',
  GET_APP_INFO: 'Failed to get app info'
} as const;

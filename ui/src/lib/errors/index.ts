export { PersonError } from './person.errors';
export { ResourceError } from './resource.errors';
export { GovernanceError, WorkflowError } from './governance.errors';
export { PPRError } from './ppr.errors';
export { NdoNotFoundError, LobbyConnectionError } from './ndo.errors';

import type { PersonError } from './person.errors';
import type { ResourceError } from './resource.errors';
import type { GovernanceError } from './governance.errors';
import type { PPRError } from './ppr.errors';
import type { NdoNotFoundError } from './ndo.errors';
import type { LobbyConnectionError } from './ndo.errors';

/** Union of tagged domain errors surfaced by stub/real zome services. */
export type DomainError =
  | PersonError
  | ResourceError
  | GovernanceError
  | PPRError
  | NdoNotFoundError
  | LobbyConnectionError;
export {
  PERSON_CONTEXTS,
  RESOURCE_CONTEXTS,
  GOVERNANCE_CONTEXTS,
  PPR_CONTEXTS,
  WORKFLOW_CONTEXTS,
  HOLOCHAIN_CLIENT_CONTEXTS
} from './error-contexts';

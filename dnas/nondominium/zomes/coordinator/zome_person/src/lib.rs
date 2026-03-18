use hdk::prelude::*;
pub use nondominium_utils::errors::PersonError;

pub mod capability_based_sharing;
pub mod device_management;
pub mod hrea_bridge;
pub mod person;
pub mod private_data;
pub mod role;

pub use capability_based_sharing::*;
pub use device_management::*;
pub use hrea_bridge::*;
pub use person::*;
pub use private_data::*;
pub use role::*;

// Resolve ambiguous re-exports
pub use capability_based_sharing::ValidationResult as SharingValidationResult;
pub use person::PromoteAgentInput as PersonPromoteAgentInput;
pub use role::PromoteAgentInput as RolePromoteAgentInput;
pub use role::ValidationResult as RoleValidationResult;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

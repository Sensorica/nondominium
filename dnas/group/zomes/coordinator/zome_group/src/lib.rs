use hdk::prelude::*;
pub use nondominium_utils::GroupError;

pub mod group_profile;
pub mod membership;
pub mod soft_link;
pub mod work_log;

pub use group_profile::*;
pub use membership::*;
pub use soft_link::*;
pub use work_log::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}

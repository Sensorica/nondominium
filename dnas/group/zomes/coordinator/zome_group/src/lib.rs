use hdk::prelude::*;
pub use nondominium_shared::GroupError;

pub mod group_profile;
pub mod membership;
pub mod ndo_anchor;
pub mod soft_link;
pub mod work_log;

pub use group_profile::*;
pub use membership::*;
pub use ndo_anchor::*;
pub use soft_link::*;
pub use work_log::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
  Ok(InitCallbackResult::Pass)
}

// TODO(signals): Push-based reactivity for shared-group items.
//
// Today the UI keeps shared-group views fresh with a pull layer only:
//   - membership self-heal + re-fetch on group open (group.store loadGroupData),
//   - silent re-fetch on tab focus + a gentle poll while a group is open
//     (GroupView.svelte), and
//   - the join-group gossip-retry/fallback in lobby.service.ts.
// This means other members' changes (new member, new NDO SoftLink, new work log)
// only surface after a poll tick, a tab focus, or a reload.
//
// When Holochain signals are fully implemented here, emit a `remote_signal` to
// the group's other members at each mutation site so peers can refresh push-style:
//   - membership.rs::join_group / leave_group  -> { kind: Member, group_hash }
//   - soft_link.rs::create_soft_link / delete_soft_link -> { kind: SoftLink, group_hash }
//   - work_log.rs::log_work                    -> { kind: WorkLog, group_hash }
//
// Implementation sketch:
//   1. Define a serializable `GroupSignal { kind: GroupSignalKind, group_hash }`.
//   2. Recipients = current member agent keys = authors of get_group_members(group_hash),
//      excluding the calling agent. (remote_signal is best-effort and online-only.)
//   3. Call `remote_signal(GroupSignal { .. }, recipients)?` after the create/delete
//      links are committed.
//   4. UI: subscribe to the app-websocket signal stream (holochain.service), and on a
//      GroupSignal whose group_hash matches the open group, call
//      groupStore.refreshCurrentGroup().
//   5. Keep the focus/poll pull layer as a fallback for offline or missed signals;
//      it can be made much less aggressive (or focus-only) once signals land.
//
// See matching TODO(signals) markers in GroupView.svelte and lobby.service.ts.

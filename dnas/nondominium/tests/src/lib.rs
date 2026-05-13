// Only common is a lib module — shared setup helpers used by all [[test]] binaries.
// governance, nondominium are [[test]] binaries only; they import this crate as
// `use nondominium_sweettest::common::*` and must NOT be declared here.
pub mod common;

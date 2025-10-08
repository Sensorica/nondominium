use hdk::prelude::*;

#[hdk_extern]
pub fn ping(_: ()) -> ExternResult<String> {
  Ok("Pong".to_string())
}

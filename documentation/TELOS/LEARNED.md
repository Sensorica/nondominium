# Learned

> Technical lessons crystallized from development. Updated as new patterns are confirmed across multiple interactions. These are not opinions — they are observations that held up under testing.

---

## Rust / Holochain HDK

**`warn!` is the primary debugging tool.** The `warn!` macro in Rust zome functions produces output visible in the test console. It is invaluable for tracing execution flow, inspecting variable state, and identifying exactly where a complex workflow diverges from expectations. Use it liberally during development; it has zero performance impact in production WASM.

**Pin HDK/HDI versions tightly.** Breaking changes occur between minor versions of the HDK (0.5.x) and HDI (0.6.x). A version bump that seems minor can break capability token behavior, link APIs, or entry serialization. Specify exact versions in `Cargo.toml` and coordinate version bumps explicitly.

**WASM-specific issues are real.** The `wasm32-unknown-unknown` target has different behavior from native Rust in certain edge cases — particularly around time functions, random number generation, and some standard library features. Test for wasm-specific issues early; discovering them late means rewriting against constraints that were always present.

**Capability tokens must be granted before cross-zome calls.** This sounds obvious but the failure mode is subtle: a cross-zome call without the appropriate capability grant may fail silently or with an opaque `WasmError`. Grant capabilities explicitly in the coordinator zome's init function or in the relevant setup path. Test capability grant/revoke behavior as part of integration tests, not as an afterthought.

**The `Path` anchor pattern is the standard discovery mechanism.** All entry types that need to be discoverable via `get_all_*` functions use the Path anchor: create a `Path::from("anchor_name")`, create a link from `path.path_entry_hash()` to the entry hash with the appropriate link type and tag. This is the established Holochain pattern — do not invent parallel discovery mechanisms.

**Link tags carry metadata.** Link tags in Holochain are arbitrary bytes — use them to store validation metadata, role assignment data, timestamps, and other small pieces of information that need to travel with the link without requiring a separate entry lookup. Design link tag schemas carefully; they cannot be updated after the fact.

---

## Testing with Tryorama

**`.only()` is essential for test development isolation.** Use `describe.only()` or `it.only()` to run a single test suite or test case while developing new functionality. Running the full suite on every iteration is too slow and makes it hard to isolate failures.

**`singleFork: true` is required for DHT consistency.** When multiple test files need to interact with the same DHT state, running them in separate forks produces race conditions. Use `singleFork: true` in the Tryorama configuration for integration and scenario tests.

**4-minute timeouts are not a smell.** Complex multi-agent scenarios involving DHT propagation, cross-zome validation, and PPR generation legitimately take time. A 4-minute timeout is not evidence of a slow test — it is evidence of a complex scenario. Reduce the timeout only after profiling shows where the time is actually spent.

**Async timing in multi-agent tests is the #1 source of intermittent failures.** DHT propagation is not instantaneous. A test that checks a resource's state immediately after creating it on a different agent may read stale data. Introduce explicit waits or retry logic at DHT read points rather than assuming propagation has completed.

---

## Architecture Patterns

**The governance-as-operator direction is an iron rule.** `zome_resource` never calls `zome_gouvernance`. The operator acts on the data; the data does not call the operator. The first time this boundary is violated for "convenience," the architecture begins to collapse. Hold the line.

**PPR generation must be part of the process design, not an afterthought.** Every new Economic Process type requires its PPR categories to be specified before implementation begins. PPR categories that are added after implementation tend to miss edge cases (partial completions, dispute scenarios, early termination). Design the receipt structure when you design the process.

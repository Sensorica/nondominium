# hREA Integration Strategy for Nondominium

## Executive Summary

This document outlines the comprehensive integration strategy for incorporating hREA (Holochain Resource-Event-Agent) into Nondominium's architecture. The approach positions hREA
as a backend economic engine while maintaining Nondominium's specialized focus on governance,
privacy, and the Private Participation Receipt (PPR) system.

**Key Decision**: Use git submodule + cross-DNA calls via the Holochain HDK `call()` function to
integrate hREA directly at the Rust/zome level. This bypasses hREA's GraphQL API entirely —
integration happens in the backend, not the UI.

**hREA Repository**: https://github.com/h-REA/hREA (branch: `sprout`)
**Architecture**: Single DNA (`hrea`) with separate coordinator + integrity zomes

---

## Architecture Vision

### Strategic Positioning

```
┌─────────────────────────────────────────────────────────────┐
│                    TrueCommon - Peer Production             │
│  (Broader application using Nondominium as core engine)     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nondominium - Peer Sharing                 │
│                (Specialized Engine - 3 Zomes)               │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │   Person        │    Resource     │   Governance    │    │
│  │  (Encrypted     │  (Delegates to  │  (PPR, Rules,   │    │
│  │   Profile +     │   hREA for core │  Validation —   │    │
│  │   ReaAgent)     │   VF types)     │   all custom)   │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
│          Cross-DNA calls via CallTargetCell::OtherRole      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     hREA DNA                                │
│        (Standard ValueFlows Implementation)                 │
│  ┌───────────┬──────────────┬───────────────┬────────────┐  │
│  │ ReaAgent  │ EcoResource  │ ReaCommitment │  ReaEco    │  │
│  │           │ (rich model) │ (full VF)     │  Event     │  │
│  └───────────┴──────────────┴───────────────┴────────────┘  │
│  ┌───────────┬──────────────┬───────────────┬────────────┐  │
│  │ ReaProcess│ ResourceSpec │  ReaAgreement │  ReaIntent │  │
│  │           │              │               │            │  │
│  └───────────┴──────────────┴───────────────┴────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Why Zome-Level Integration (Not GraphQL)

hREA exposes a GraphQL API intended for UI consumption. For Nondominium, integration must happen
at the Rust/HDK layer because:

1. **Business logic integrity**: Governance rules and PPR generation must fire atomically with
   economic events — this cannot be guaranteed through a UI-level API roundtrip
2. **Capability security**: Cross-zome calls within the same conductor maintain Holochain's
   capability-based access model; GraphQL calls would bypass this
3. **Performance**: Same-conductor bridge calls (~5-10ms) vs network roundtrips (~100-500ms)
4. **Atomicity**: Creating a Commitment + generating a PPR claim must happen in the same zome
   call context

---

## Gap Analysis: Current Nondominium vs hREA

### Entity Comparison

#### EconomicResource

| Field     | Nondominium (current)              | hREA `ReaEconomicResource`                                                                                        |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| quantity  | `f64` (single field)               | `accounting_quantity: Option<QuantityValue>` + `onhand_quantity: Option<QuantityValue>` (two separate quantities) |
| unit      | `String`                           | `unit_of_effort: Option<ActionHash>` (Unit is a first-class entry)                                                |
| custodian | `AgentPubKey` (direct)             | `primary_accountable: Option<ActionHash>` (links to ReaAgent entry)                                               |
| location  | `Option<String>`                   | `current_location: Option<String>` (same)                                                                         |
| state     | `ResourceState` enum               | `state: Option<String>` (string-based)                                                                            |
| spec link | via `SpecificationToResource` link | `conforms_to: Option<ActionHash>` (embedded)                                                                      |
| —         | missing                            | `contained_in: Option<ActionHash>` (nested resources)                                                             |
| —         | missing                            | `stage: Option<ActionHash>` (lifecycle stage entry)                                                               |
| —         | missing                            | `lot: Option<String>` (batch tracking)                                                                            |
| —         | missing                            | `name: Option<String>`                                                                                            |
| —         | missing                            | `image: Option<String>`                                                                                           |
| —         | missing                            | `tracking_identifier: Option<String>`                                                                             |

**Key gap**: Nondominium's `EconomicResource` uses a single `quantity: f64` and a `String` unit.
hREA uses `QuantityValue { has_numerical_value: f64, has_unit: ActionHash }` and tracks both
accounting quantity (committed) and on-hand quantity (physically available) separately. This
distinction is fundamental to ValueFlows and currently missing.

**Also critical**: hREA automatically updates `onhand_quantity` and `accounting_quantity` when
an economic event is created, based on the action type's `ActionEffect`. Nondominium has no
equivalent automatic quantity update system.

---

#### EconomicEvent

| Field    | Nondominium (current)                 | hREA `ReaEconomicEvent`                                                 |
| -------- | ------------------------------------- | ----------------------------------------------------------------------- |
| action   | `VfAction` (custom Rust enum)         | `rea_action: String` (standard VF string + `vf_actions` crate)          |
| provider | `AgentPubKey` (direct)                | `provider: Option<ActionHash>` (links to ReaAgent)                      |
| receiver | `AgentPubKey` (direct)                | `receiver: Option<ActionHash>` (links to ReaAgent)                      |
| resource | `resource_inventoried_as: ActionHash` | `resource_inventoried_as: Option<ActionHash>`                           |
| affects  | `affects: ActionHash` (duplicate?)    | `to_resource_inventoried_as: Option<ActionHash>` (destination resource) |
| quantity | `resource_quantity: f64`              | `resource_quantity: Option<QuantityValue>`                              |
| time     | `event_time: Timestamp`               | `has_point_in_time: Option<Timestamp>` + `has_beginning` + `has_end`    |
| —        | missing                               | `input_of: Option<ActionHash>` (Process)                                |
| —        | missing                               | `output_of: Option<ActionHash>` (Process)                               |
| —        | missing                               | `fulfills: Option<Vec<ActionHash>>` (Commitment links)                  |
| —        | missing                               | `satisfies: Option<Vec<ActionHash>>` (Intent links)                     |
| —        | missing                               | `realization_of: Option<ActionHash>` (Agreement)                        |
| —        | missing                               | `triggered_by: Option<ActionHash>` (triggering Event)                   |
| —        | missing                               | `corrects: Option<ActionHash>` (correction chain)                       |

**Key gap**: The Nondominium `EconomicEvent` has a field called `affects` which appears to
duplicate `resource_inventoried_as`. hREA's `to_resource_inventoried_as` is the correct field
for the destination resource in a transfer — a different concept. More critically, the entire
`fulfills` relationship (Event fulfills Commitment) is absent from Nondominium's model.

---

#### Commitment

| Field    | Nondominium (current)                              | hREA `ReaCommitment`                                             |
| -------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| action   | `VfAction` enum                                    | `rea_action: Option<String>`                                     |
| provider | `AgentPubKey`                                      | `provider: Option<ActionHash>` (ReaAgent)                        |
| receiver | `AgentPubKey`                                      | `receiver: Option<ActionHash>` (ReaAgent)                        |
| resource | `resource_inventoried_as: Option<ActionHash>`      | same field name                                                  |
| spec     | `resource_conforms_to: Option<ActionHash>`         | `resource_conforms_to: Option<ActionHash>` (same)                |
| process  | `input_of: Option<ActionHash>` (stub, always None) | `input_of: Option<ActionHash>` + `output_of: Option<ActionHash>` |
| due date | `due_date: Timestamp`                              | `due: Option<Timestamp>`                                         |
| —        | missing                                            | `effort_quantity: Option<QuantityValue>`                         |
| —        | missing                                            | `resource_quantity: Option<QuantityValue>`                       |
| —        | missing                                            | `has_beginning` / `has_end` / `has_point_in_time`                |
| —        | missing                                            | `clause_of: Option<ActionHash>` (Agreement)                      |
| —        | missing                                            | `planned_within: Option<ActionHash>` (Plan)                      |
| —        | missing                                            | `satisfies: Option<ActionHash>` (Intent)                         |
| —        | missing                                            | `finished: Option<bool>`                                         |

---

#### ResourceSpecification

| Field       | Nondominium (current) | hREA `ReaResourceSpecification`                |
| ----------- | --------------------- | ---------------------------------------------- |
| name        | `String`              | `String` (same, required)                      |
| description | `String`              | (missing — hREA is simpler here)               |
| category    | `String`              | (missing — Nondominium extension)              |
| image_url   | `Option<String>`      | `image: Option<String>`                        |
| tags        | `Vec<String>`         | (missing — Nondominium extension)              |
| is_active   | `bool`                | (missing — Nondominium extension)              |
| —           | missing               | `default_unit_of_effort: Option<ActionHash>`   |
| —           | missing               | `default_unit_of_resource: Option<ActionHash>` |

**Note**: For ResourceSpecification, Nondominium has _more_ fields than hREA (category, tags,
description, is_active). This is a case where the **hybrid** approach makes sense.

---

#### VfAction vs hREA Actions

Nondominium defines a custom Rust enum:

```rust
pub enum VfAction { Transfer, Move, Use, Consume, Produce, Work, Modify, Combine,
                    Separate, Raise, Lower, Cite, Accept, InitialTransfer,
                    AccessForUse, TransferCustody }
```

hREA uses `rea_action: String` with standardized ValueFlows action names:

- `"transfer"`, `"move"`, `"use"`, `"consume"`, `"produce"`, `"work"`, `"modify"`,
  `"combine"`, `"separate"`, `"raise"`, `"lower"`, `"cite"`, `"accept"`, `"dropAll"`, `"pickup"`

hREA's `vf_actions` crate maps action strings to `ActionEffect` variants that control how
resource quantities change on event creation. Nondominium's custom enum lacks this system.

---

### Concepts Entirely Missing from Nondominium

| hREA Type                   | Purpose                                         | Priority         |
| --------------------------- | ----------------------------------------------- | ---------------- |
| `ReaProcess`                | Groups events/commitments into production flows | Medium (Phase 3) |
| `ReaAgreement`              | Multi-party coordination framework              | Low (Phase 4)    |
| `ReaProposal` / `ReaIntent` | What agents want to do / offer                  | Low (Phase 4)    |
| `ReaPlan`                   | Planned value flows                             | Low (Phase 4)    |
| `ReaFulfillment`            | Explicit Event-fulfills-Commitment link         | High (Phase 2)   |
| `QuantityValue` struct      | Typed quantity with unit reference              | High (Phase 2)   |
| Unit entries                | First-class unit of measure                     | High (Phase 2)   |
| Auto quantity update        | Resource quantities auto-update on event        | High (Phase 2)   |

---

### Nondominium Types With No hREA Equivalent (Keep Custom)

These are Nondominium's unique innovations and must remain fully custom:

| Type                              | Reason                                               |
| --------------------------------- | ---------------------------------------------------- |
| `PrivateParticipationClaim` (PPR) | Core Nondominium innovation; no VF equivalent        |
| `GovernanceRule`                  | Governance-as-operator pattern; Nondominium-specific |
| `ResourceValidation`              | Community validation flow; Nondominium-specific      |
| `ValidationReceipt`               | Validator attestation; Nondominium-specific          |
| `EncryptedProfile`                | Private PII layer; hREA has no privacy model         |
| Role-based access control         | Capability grants tied to governance roles           |

---

## Decision Matrix

| Entity                                     | Decision                      | Implementation                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `EconomicResource`                         | **Use hREA**                  | Call `create_economic_event_with_resource` in hREA; store returned hash in Nondominium link                                                                                                |
| `EconomicEvent`                            | **Use hREA**                  | Call `create_rea_economic_event` in hREA; PPR generation fires after in Nondominium                                                                                                        |
| `Commitment`                               | **Use hREA**                  | Call `create_rea_commitment`; link to PPR claims via Nondominium-side links                                                                                                                |
| `ResourceSpecification`                    | **Hybrid**                    | Create `ReaResourceSpecification` in hREA for VF compliance; extend with a Nondominium `ResourceSpecificationExtension` entry (category, tags, description, is_active) linked to hREA hash |
| `VfAction` enum                            | **Replace with hREA strings** | Use hREA action strings (`"transfer"`, `"use"`, etc.); map custom actions (`InitialTransfer`, `AccessForUse`, `TransferCustody`) to hREA-compatible strings or extensions                  |
| `PrivateParticipationClaim`                | **Keep custom**               | No hREA equivalent; core innovation                                                                                                                                                        |
| `GovernanceRule`                           | **Keep custom**               | No hREA equivalent; governance-as-operator pattern                                                                                                                                         |
| `ValidationReceipt` / `ResourceValidation` | **Keep custom**               | No hREA equivalent                                                                                                                                                                         |
| `Person` / Agent                           | **Hybrid**                    | `ReaAgent` in hREA DNA (public identity); `EncryptedProfile` stays in Nondominium DNA                                                                                                      |

---

## Cross-DNA Call Patterns (Rust / HDK)

All calls from Nondominium zomes to hREA use `CallTargetCell::OtherRole("hrea".into())`.
The hREA coordinator zome name is also `"hrea"`.

### Helper: Generic hREA Bridge Call

```rust
// In a shared utilities module accessible to coordinator zomes
use hdk::prelude::*;

pub fn call_hrea<I, O>(fn_name: &str, payload: &I) -> ExternResult<O>
where
    I: serde::Serialize + std::fmt::Debug,
    O: serde::de::DeserializeOwned + std::fmt::Debug,
{
    let response = call(
        CallTargetCell::OtherRole("hrea".into()),
        "hrea",
        fn_name.into(),
        None,
        payload,
    )?;

    match response {
        ZomeCallResponse::Ok(extern_io) => extern_io.decode::<O>().map_err(|e| {
            wasm_error!(WasmErrorInner::Guest(format!(
                "hREA response decode error for {}: {:?}",
                fn_name, e
            )))
        }),
        ZomeCallResponse::Unauthorized(_, _, fn_name, _) => {
            Err(wasm_error!(WasmErrorInner::Guest(format!(
                "hREA call unauthorized: {}",
                fn_name
            ))))
        }
        ZomeCallResponse::NetworkError(e) => {
            Err(wasm_error!(WasmErrorInner::Guest(format!(
                "hREA network error: {}",
                e
            ))))
        }
        ZomeCallResponse::CountersigningSession(e) => {
            Err(wasm_error!(WasmErrorInner::Guest(format!(
                "hREA countersigning error: {}",
                e
            ))))
        }
    }
}
```

---

### Pattern 1: Creating a Resource + Event (atomic)

hREA provides `create_economic_event_with_resource` which creates both in one call and
automatically sets up quantities. Use this for resource registration:

```rust
// zome_resource coordinator — registers a new resource in hREA
pub fn register_resource_in_hrea(
    hrea_agent_hash: ActionHash,
    hrea_spec_hash: ActionHash,
    quantity: f64,
    unit_hash: ActionHash,
) -> ExternResult<ActionHash> {
    #[derive(Serialize, Deserialize, Debug)]
    struct QuantityValue {
        has_numerical_value: f64,
        has_unit: ActionHash,
    }

    #[derive(Serialize, Deserialize, Debug)]
    struct ReaEconomicResource {
        id: Option<ActionHash>,
        conforms_to: Option<ActionHash>,
        primary_accountable: Option<ActionHash>,
        accounting_quantity: Option<QuantityValue>,
        onhand_quantity: Option<QuantityValue>,
        // other fields as None...
    }

    #[derive(Serialize, Deserialize, Debug)]
    struct ReaEconomicEvent {
        id: Option<ActionHash>,
        rea_action: String,
        provider: Option<ActionHash>,
        receiver: Option<ActionHash>,
        resource_quantity: Option<QuantityValue>,
        has_point_in_time: Option<Timestamp>,
    }

    #[derive(Serialize, Deserialize, Debug)]
    struct EconomicEventWithResource {
        economic_event: ReaEconomicEvent,
        resource: ReaEconomicResource,
    }

    let qty = QuantityValue {
        has_numerical_value: quantity,
        has_unit: unit_hash,
    };

    let input = EconomicEventWithResource {
        economic_event: ReaEconomicEvent {
            id: None,
            rea_action: "produce".to_string(),
            provider: Some(hrea_agent_hash.clone()),
            receiver: Some(hrea_agent_hash.clone()),
            resource_quantity: Some(QuantityValue {
                has_numerical_value: quantity,
                has_unit: unit_hash.clone(),
            }),
            has_point_in_time: Some(sys_time()?),
        },
        resource: ReaEconomicResource {
            id: None,
            conforms_to: Some(hrea_spec_hash),
            primary_accountable: Some(hrea_agent_hash),
            accounting_quantity: Some(qty),
            onhand_quantity: None, // set by hREA from event
        },
    };

    let record: Record = call_hrea("create_economic_event_with_resource", &input)?;
    Ok(record.action_address().clone())
}
```

---

### Pattern 2: Creating a Commitment in hREA

```rust
// zome_gouvernance coordinator — creates a commitment in hREA
pub fn propose_commitment_in_hrea(
    rea_action: &str,
    provider_hrea_hash: ActionHash,
    receiver_hrea_hash: ActionHash,
    resource_hash: Option<ActionHash>,
    resource_spec_hash: Option<ActionHash>,
    quantity: f64,
    unit_hash: ActionHash,
    due: Option<Timestamp>,
) -> ExternResult<ActionHash> {
    #[derive(Serialize, Deserialize, Debug)]
    struct QuantityValue { has_numerical_value: f64, has_unit: ActionHash }

    #[derive(Serialize, Deserialize, Debug)]
    struct ReaCommitment {
        id: Option<ActionHash>,
        rea_action: Option<String>,
        provider: Option<ActionHash>,
        receiver: Option<ActionHash>,
        resource_inventoried_as: Option<ActionHash>,
        resource_conforms_to: Option<ActionHash>,
        resource_quantity: Option<QuantityValue>,
        due: Option<Timestamp>,
        finished: Option<bool>,
    }

    let input = ReaCommitment {
        id: None,
        rea_action: Some(rea_action.to_string()),
        provider: Some(provider_hrea_hash),
        receiver: Some(receiver_hrea_hash),
        resource_inventoried_as: resource_hash,
        resource_conforms_to: resource_spec_hash,
        resource_quantity: Some(QuantityValue {
            has_numerical_value: quantity,
            has_unit: unit_hash,
        }),
        due,
        finished: Some(false),
    };

    let record: Record = call_hrea("create_rea_commitment", &input)?;
    Ok(record.action_address().clone())
}
```

---

### Pattern 3: Recording an Economic Event (fulfills Commitment)

When a commitment is fulfilled, create an economic event in hREA that references both the
resource and the commitment. hREA automatically updates resource quantities.

```rust
// zome_gouvernance coordinator — records fulfillment of a commitment
pub fn record_economic_event_in_hrea(
    rea_action: &str,
    provider_hrea_hash: ActionHash,
    receiver_hrea_hash: ActionHash,
    resource_hash: ActionHash,
    to_resource_hash: Option<ActionHash>,
    quantity: f64,
    unit_hash: ActionHash,
    fulfills: Vec<ActionHash>,      // hREA commitment hashes
) -> ExternResult<ActionHash> {
    #[derive(Serialize, Deserialize, Debug)]
    struct QuantityValue { has_numerical_value: f64, has_unit: ActionHash }

    #[derive(Serialize, Deserialize, Debug)]
    struct ReaEconomicEvent {
        id: Option<ActionHash>,
        rea_action: String,
        provider: Option<ActionHash>,
        receiver: Option<ActionHash>,
        resource_inventoried_as: Option<ActionHash>,
        to_resource_inventoried_as: Option<ActionHash>,
        resource_quantity: Option<QuantityValue>,
        has_point_in_time: Option<Timestamp>,
        fulfills: Option<Vec<ActionHash>>,
    }

    let input = ReaEconomicEvent {
        id: None,
        rea_action: rea_action.to_string(),
        provider: Some(provider_hrea_hash),
        receiver: Some(receiver_hrea_hash),
        resource_inventoried_as: Some(resource_hash),
        to_resource_inventoried_as: to_resource_hash,
        resource_quantity: Some(QuantityValue {
            has_numerical_value: quantity,
            has_unit: unit_hash,
        }),
        has_point_in_time: Some(sys_time()?),
        fulfills: if fulfills.is_empty() { None } else { Some(fulfills) },
    };

    let record: Record = call_hrea("create_rea_economic_event", &input)?;
    Ok(record.action_address().clone())
}
```

---

### Pattern 4: Capability Grants for Cross-Role Calls

Depending on the hREA DNA's capability configuration, cross-role calls may need explicit
unrestricted grants. Add to hREA DNA's init if required, or configure in the happ.yaml:

```rust
// In zome_gouvernance or zome_resource init() — grant hREA functions
#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let mut fns: BTreeSet<(ZomeName, FunctionName)> = BTreeSet::new();
    fns.insert(("hrea".into(), "create_rea_economic_event".into()));
    fns.insert(("hrea".into(), "create_economic_event_with_resource".into()));
    fns.insert(("hrea".into(), "create_rea_commitment".into()));
    fns.insert(("hrea".into(), "get_latest_rea_economic_resource".into()));

    create_cap_grant(CapGrantEntry {
        tag: "nondominium-hrea-bridge".into(),
        access: CapAccess::Unrestricted,
        functions: GrantedFunctions::Listed(fns),
    })?;

    Ok(InitCallbackResult::Pass)
}
```

---

### Pattern 5: Person / Agent Hybrid

When creating a Person in Nondominium, also create a `ReaAgent` in hREA and store the
cross-reference:

```rust
// zome_person coordinator — create_person now creates in both DNAs
pub fn create_person_with_hrea_agent(
    name: String,
    avatar_url: Option<String>,
    private_data: Option<EncryptedProfileData>,
) -> ExternResult<PersonWithHreaRecord> {
    #[derive(Serialize, Deserialize, Debug)]
    struct ReaAgent {
        id: Option<ActionHash>,
        name: String,
        agent_type: String,
        image: Option<String>,
        classified_as: Option<Vec<String>>,
        note: Option<String>,
    }

    // 1. Create ReaAgent in hREA DNA
    let hrea_agent_input = ReaAgent {
        id: None,
        name: name.clone(),
        agent_type: "Person".to_string(),
        image: avatar_url.clone(),
        classified_as: None,
        note: None,
    };
    let hrea_record: Record = call_hrea("create_rea_agent", &hrea_agent_input)?;
    let hrea_agent_hash = hrea_record.action_address().clone();

    // 2. Create Nondominium Person entry (stores reference to hREA agent)
    let person = Person {
        name,
        avatar_url,
        hrea_agent_hash: Some(hrea_agent_hash.clone()),
        created_at: sys_time()?,
    };
    let person_hash = create_entry(&EntryTypes::Person(person.clone()))?;

    // 3. Create EncryptedProfile if private data provided
    let encrypted_profile_hash = if let Some(private) = private_data {
        Some(create_entry(&EntryTypes::EncryptedProfile(private))?)
    } else {
        None
    };

    Ok(PersonWithHreaRecord {
        person_hash,
        hrea_agent_hash,
        encrypted_profile_hash,
    })
}
```

---

## hApp Bundle Configuration

### happ.yaml (dual-DNA setup)

```yaml
manifest_version: "1"
name: nondominium
description: Nondominium peer-sharing hApp with hREA economic backend
roles:
  - name: nondominium
    provisioning:
      strategy: create
      deferred: false
    dna:
      bundled: nondominium.dna
      modifiers:
        network_seed: ~
        properties: ~
  - name: hrea
    provisioning:
      strategy: create
      deferred: false
    dna:
      bundled: hrea.dna
      modifiers:
        network_seed: ~
        properties: ~
```

The role name `"hrea"` in `happ.yaml` is what gets passed to
`CallTargetCell::OtherRole("hrea".into())` in coordinator zome code.

---

### Git Submodule Setup

```bash
# Add hREA as a submodule (pin to stable sprout branch commit)
git submodule add -b sprout https://github.com/h-REA/hREA.git vendor/hrea
cd vendor/hrea
git checkout <stable-commit-sha>
cd ../..
git add vendor/hrea .gitmodules
git commit -m "add hREA as submodule (sprout branch)"
```

### Cargo.toml Workspace

```toml
[workspace]
members = [
    "dnas/nondominium/zomes/coordinator/*",
    "dnas/nondominium/zomes/integrity/*",
    # hREA zomes compiled separately via their own build system
]

# If sharing types directly (advanced integration):
[workspace.dependencies]
hrea_integrity = { path = "vendor/hrea/dnas/hrea/zomes/integrity/hrea" }
```

**Note**: The struct definitions in the call patterns above use local inline structs to avoid
coupling Nondominium's crate graph to hREA's. For tighter integration, use
`hrea_integrity` as a workspace dependency and import types directly.

---

## Migration Strategy

Holochain DHT entries are immutable — existing entries cannot be deleted or migrated in-place.
The migration path respects this constraint.

### Phase 2 Migration (Current)

**Goal**: Route all new entry creation through hREA; existing entries remain valid.

1. **No changes to existing entries**: Existing `Commitment`, `EconomicEvent`, and `EconomicResource`
   entries on the DHT remain as-is and continue to be queryable
2. **New entries use hREA**: All new function calls in coordinator zomes call hREA via bridge,
   then store the returned `ActionHash` in Nondominium-side link structures
3. **Cross-reference links**: Add a `HreaResourceHash` link type in `zome_resource_integrity`
   linking `EconomicResource` original hash → hREA `ReaEconomicResource` hash
4. **Dual-read query layer**: `get_all_economic_resources()` returns both legacy custom entries
   and hREA-backed entries, normalized through a shared response type

### Dual-Read Response Type

```rust
#[derive(Serialize, Deserialize, Debug)]
pub enum ResourceResponse {
    // Legacy custom entry (Phase 1 data)
    Legacy {
        hash: ActionHash,
        resource: EconomicResource,
    },
    // hREA-backed entry (Phase 2+ data)
    HreaBackd {
        nondominium_hash: ActionHash,
        hrea_hash: ActionHash,
        // normalized fields
        quantity: f64,
        custodian: AgentPubKey,
    },
}
```

### Phase 3: Type Deprecation

Once Phase 2 has been running for a defined period and all active resources are hREA-backed:

- Stop creating new `zome_gouvernance::Commitment` entries; use only `ReaCommitment` via hREA
- Stop creating new `zome_gouvernance::EconomicEvent` entries; use only `ReaEconomicEvent` via hREA
- Keep the integrity types (they cannot be removed without breaking DHT validation of old entries)
- Mark coordinator functions as deprecated in documentation

---

## Privacy Architecture

### hREA's Privacy Model

hREA has **no custom privacy implementation**. All entries are public by design:

- `ReaAgent` entries contain only public-facing information
- `ReaEconomicResource` entries are fully public
- No encrypted or private entry types exist

### Nondominium's Complementary Privacy Layer

Nondominium's `EncryptedProfile` system fills exactly the gap hREA leaves:

| Layer                  | What                                       | Where                              |
| ---------------------- | ------------------------------------------ | ---------------------------------- |
| Public identity        | `ReaAgent` (name, avatar, type)            | hREA DNA — discoverable by all     |
| Private PII            | `EncryptedProfile` (email, phone, address) | Nondominium DNA — capability-gated |
| Economic coordination  | `ReaEconomicResource`, `ReaCommitment`     | hREA DNA — public ValueFlows       |
| Participation tracking | `PrivateParticipationClaim` (PPR)          | Nondominium DNA — private to agent |

This is not a conflict; it is a clean division of concerns:

- hREA handles **economic visibility** (what resources exist, what commitments are made)
- Nondominium handles **relational privacy** (who you are, what you've privately contributed)

---

## Testing Strategy

### Dual-DNA Tryorama Setup

```typescript
// tests/src/multi-dna/hrea-integration.test.ts
import { runScenario, dhtSync } from "@holochain/tryorama";

describe("Nondominium-hREA integration", () => {
  test("creating a resource creates ReaEconomicResource in hREA DNA", async () => {
    await runScenario(async (scenario) => {
      const appBundleSource = {
        type: "path",
        value: "workdir/nondominium.webhapp", // includes both DNAs
      };

      const [alice, bob] = await scenario.addPlayersWithApps([
        { appBundleSource },
        { appBundleSource },
      ]);

      // Create resource via Nondominium interface
      const resourceResult = await alice.appWs.callZome({
        role_name: "nondominium",
        zome_name: "zome_resource",
        fn_name: "create_economic_resource",
        payload: {
          spec_hash: someSpecHash,
          quantity: 1.0,
          unit: "piece",
          current_location: null,
        },
      });

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Verify ReaEconomicResource exists in hREA DNA
      const hreaResource = await alice.appWs.callZome({
        role_name: "hrea",
        zome_name: "hrea",
        fn_name: "get_latest_rea_economic_resource",
        payload: resourceResult.hrea_resource_hash,
      });

      expect(hreaResource).toBeTruthy();
      expect(hreaResource.entry.conforms_to).toEqual(someHreaSpecHash);
    });
  });

  test("PPR claim generated after economic event", async () => {
    await runScenario(async (scenario) => {
      // ... setup

      // Record event (creates in hREA AND generates PPR in Nondominium)
      const eventResult = await alice.appWs.callZome({
        role_name: "nondominium",
        zome_name: "zome_gouvernance",
        fn_name: "create_economic_event",
        payload: {
          rea_action: "use",
          resource_hash: resourceHash,
          quantity: 1.0,
          // ...
        },
      });

      // Verify event exists in hREA
      const hreaEvent = await alice.appWs.callZome({
        role_name: "hrea",
        zome_name: "hrea",
        fn_name: "get_latest_rea_economic_event",
        payload: eventResult.hrea_event_hash,
      });
      expect(hreaEvent).toBeTruthy();

      // Verify PPR claim generated in Nondominium (private — only Alice can see)
      const pprClaims = await alice.appWs.callZome({
        role_name: "nondominium",
        zome_name: "zome_gouvernance",
        fn_name: "get_my_participation_claims",
        payload: null,
      });
      expect(pprClaims.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Performance Considerations

### Call Latency Hierarchy

| Call Type                         | Approximate Latency | When to Use                   |
| --------------------------------- | ------------------- | ----------------------------- |
| Cross-zome, same DNA              | ~1ms                | Intra-Nondominium calls       |
| Cross-DNA bridge (same conductor) | ~5-10ms             | Nondominium → hREA            |
| DHT get (local)                   | ~1-5ms              | Reading own-authored entries  |
| DHT get (remote)                  | ~100-500ms          | Reading peer-authored entries |
| Remote agent call                 | ~200-1000ms         | Agent-to-agent direct calls   |

The bridge call overhead (~5-10ms) is acceptable because hREA integration happens at write time
(creating resources/events), not at read time for every UI render.

### Optimization Patterns

1. **Cache hREA hashes**: Store returned hREA `ActionHash` values in Nondominium links so reads
   don't need to re-query hREA
2. **Batch event creation**: Where multiple events are logically grouped, consider a single
   `create_economic_event_with_resource` call over multiple separate calls
3. **Lazy hREA sync**: For non-critical metadata (e.g., updating `ReaAgent` image), defer the
   hREA call to a background signal rather than blocking the main operation

---

## Implementation Roadmap

### Phase 1: Foundation (Person Zome — CURRENT TARGET)

- [ ] Set up hREA git submodule (`vendor/hrea`, `sprout` branch)
- [ ] Configure `happ.yaml` with `nondominium` and `hrea` roles
- [ ] Build hREA DNA and include in `.webhapp` bundle
- [ ] Add `hrea_agent_hash: Option<ActionHash>` field to `Person` integrity entry
- [ ] Implement `create_rea_agent` bridge call in `zome_person` coordinator
- [ ] Update `create_person` to create `ReaAgent` in hREA first
- [ ] Write Tryorama tests for dual-DNA person creation
- [ ] Validate `get_rea_agents_from_action_hashes` cross-DNA read

### Phase 2: Resource Lifecycle

- [ ] Add `hrea_resource_hash: Option<ActionHash>` field or link to resource entries
- [ ] Implement `create_economic_event_with_resource` bridge call
- [ ] Implement `create_rea_resource_specification` bridge call
- [ ] Implement `ResourceSpecificationExtension` hybrid pattern
- [ ] Re-enable cross-zome governance call (currently commented out in `economic_resource.rs`)
- [ ] Write dual-DNA resource lifecycle tests

### Phase 3: Governance Integration

- [ ] Implement `create_rea_commitment` bridge call
- [ ] Implement `create_rea_economic_event` bridge call (with `fulfills` field)
- [ ] Wire PPR generation to fire after hREA event creation
- [ ] Implement dual-read query layer for legacy + hREA resources
- [ ] Write commitment → event → PPR end-to-end scenario tests

### Phase 4: Production Readiness

- [ ] Security audit of cross-DNA capability grants
- [ ] Performance benchmarks for bridge call overhead at scale
- [ ] Submodule version pinning and upgrade process
- [ ] Community deployment guide

---

## Risk Assessment

| Risk                                                  | Likelihood | Impact | Mitigation                                                        |
| ----------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------- |
| hREA `sprout` branch API changes                      | Medium     | High   | Pin to a specific commit hash, not a branch pointer               |
| Cross-DNA call capability issues                      | Medium     | High   | Test cap grants early in Phase 1                                  |
| hREA DNA build incompatibility (HDK version mismatch) | Medium     | High   | Verify HDK versions match between Nondominium and hREA workspaces |
| Performance degradation from bridge calls             | Low        | Medium | Benchmark early; cache hREA hashes in Nondominium links           |
| Migration query complexity (dual-read layer)          | Medium     | Low    | Keep migration period short; prioritize hREA-backed data          |

---

## Future: PPR System as hREA Enhancement

Nondominium's PPR system has no current hREA equivalent. It could eventually be contributed to
hREA as a governance extension:

1. **Prove the pattern**: Demonstrate PPR value in Nondominium production
2. **Document the spec**: Formalize `PrivateParticipationClaim` as a ValueFlows extension
3. **Propose to community**: Submit to ValueFlows spec and hREA governance
4. **Upstream contribution**: Contribute proven patterns back to hREA once validated

---

## Conclusion

Nondominium's integration strategy uses hREA as the **economic data layer** (EconomicResource,
EconomicEvent, Commitment, Agent) while keeping Nondominium's **governance and privacy layer**
entirely custom (PPR, GovernanceRule, ValidationReceipt, EncryptedProfile).

The bridge pattern — `call(CallTargetCell::OtherRole("hrea"), "hrea", fn_name, ...)` — is the
mechanism that makes this work at the Rust/zome level without touching hREA's GraphQL API.

Key outcomes:

- **ValueFlows compliance**: hREA's battle-tested VF model handles all economic data correctly
- **Privacy preserved**: EncryptedProfile + PPR system layers over hREA's public economic data
- **Governance innovation intact**: PPR system remains Nondominium's unique contribution
- **Migration safe**: DHT immutability respected; legacy entries remain valid indefinitely
- **Ecosystem interoperability**: Other hREA-based apps can interoperate with Nondominium's
  economic data directly through the shared hREA DNA

---

_Document Version: 2.0_
_Last Updated: 2026-03-02_
_Status: Implementation Ready_
_hREA Source: https://github.com/h-REA/hREA (branch: sprout)_

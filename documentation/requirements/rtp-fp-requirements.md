# RTP-FP Technical Requirements Specification

**Version**: 0.2
**Date**: 2025-01-28
**Audience**: Developers, System Architects, Technical Implementation Teams
**Framework**: Holochain HDK 0.5.3 / hREA ValueFlows / JSON-LD 1.1

## Executive Summary

This technical requirements document provides the detailed implementation specifications for the Resource Transport/Flow Protocol (RTP-FP). It contains all technical data structures, validation rules, governance algorithms, and integration patterns removed from the stakeholder specification.

## 1. System Architecture

### 1.1 Holochain DNA/Zome Structure

```rust
// DNA Structure
pub struct RtpDna {
    pub zomes: Vec<Zome>,
}

// Zome Distribution
pub enum RtpZomes {
    Person,      // Agent identity, roles, custodial relationships
    Resource,    // Resource specifications, lifecycle management
    Governance,  // PPR issuance, validation, governance rules
    Semantic,    // JSON-LD serialization, context management, external API
}
```

### 1.2 JSON-LD Implementation Requirements

#### 1.2.1 Dependency Integration

```toml
[dependencies]
json-ld = "0.21"
iref = "3.1"
rdf-types = "0.22"
contextual = "0.3"
static-iref = "0.3"
serde_json = "1.0"
uuid = { version = "1.0", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

#### 1.2.2 Context Management Implementation

```rust
use json_ld::{JsonLdProcessor, RemoteDocument, RemoteDocumentReference};
use static_iref::iri;

pub struct RtpContextManager {
    vocabulary: IndexVocabulary,
    loader: FsLoader,
    contexts: HashMap<String, String>,
}

impl RtpContextManager {
    pub fn new() -> Self {
        let mut loader = FsLoader::default();

        // Mount local contexts
        loader.mount(
            iri!("https://nondominium.org/contexts/").to_owned(),
            "contexts/"
        );
        loader.mount(
            iri!("https://w3id.org/valueflows/contexts/").to_owned(),
            "vendor/valueflows-contexts/"
        );

        let mut contexts = HashMap::new();
        contexts.insert("rtp".to_string(), include_str!("contexts/rtp.jsonld").to_string());
        contexts.insert("ppr".to_string(), include_str!("contexts/ppr.jsonld").to_string());

        Self {
            vocabulary: IndexVocabulary::new(),
            loader,
            contexts,
        }
    }

    pub async fn serialize_rtp_event(&mut self, event: &ResourceFlowEvent) -> Result<Value, SerializationError> {
        let json_ld_doc = event.to_json_ld_document()?;

        // Compact with RTP-FP context
        let compacted = json_ld_doc
            .compact_with(
                &RemoteDocumentReference::Iri(self.vocabulary.insert(
                    iri!("https://nondominium.org/contexts/rtp.jsonld")
                )),
                &mut self.vocabulary,
                &mut self.loader
            )
            .await?;

        Ok(compacted.into_serializable())
    }

    pub async fn deserialize_rtp_event(&mut self, json_ld: &Value) -> Result<ResourceFlowEvent, DeserializationError> {
        // Expand JSON-LD for processing
        let expanded = json_ld
            .expand(
                &RemoteDocumentReference::Iri(self.vocabulary.insert(
                    iri!("https://nondominium.org/contexts/rtp.jsonld")
                )),
                &mut self.vocabulary,
                &mut self.loader
            )
            .await?;

        ResourceFlowEvent::from_expanded_json_ld(&expanded)
    }
}
```

#### 1.2.3 JSON-LD Context Files

**rtp.jsonld**:

```json
{
  "@context": {
    "rtp": "https://nondominium.org/ontology/rtp#",
    "vf": "https://w3id.org/valueflows/ont/vf#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "ResourceFlowEvent": "rtp:ResourceFlowEvent",
    "TransportDimensions": "rtp:TransportDimensions",
    "PhysicalDimension": "rtp:PhysicalDimension",
    "CustodialDimension": "rtp:CustodialDimension",
    "ValueDimension": "rtp:ValueDimension",
    "LegalDimension": "rtp:LegalDimension",
    "InformationDimension": "rtp:InformationDimension",
    "transportDimensions": {
      "@id": "rtp:transportDimensions",
      "@container": "@graph"
    },
    "physical": "rtp:physical",
    "custodial": "rtp:custodial",
    "value": "rtp:value",
    "legal": "rtp:legal",
    "information": "rtp:information",
    "pprReceipts": "rtp:pprReceipts"
  }
}
```

### 1.3 Hybrid Storage Architecture

#### 1.3.1 Internal Holochain Structures

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EconomicResource {
    // Core Holochain storage
    pub id: EntryHash,
    pub conforms_to: ActionHash,
    pub accounting_quantity: f64,
    pub primary_accountable: AgentPubKey,
    pub created_at: Timestamp,

    // JSON-LD semantic mapping (external interface)
    pub vf_action: String,                    // "vf:transport-custody"
    pub vf_resource_classified_as: Vec<String>,
    pub vf_current_location: Option<LocationData>,
    pub vf_note: Option<String>,

    // RTP-FP specific extensions
    pub transport_dimensions: TransportDimensions,
    pub lifecycle_stage: LifecycleStage,
    pub governance_rules: Vec<GovernanceRuleHash>,
}

impl EconomicResource {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@context": [
                "https://w3id.org/valueflows/contexts/vf.jsonld",
                "https://nondominium.org/contexts/rtp.jsonld",
                "https://nondominium.org/contexts/ppr.jsonld"
            ],
            "@id": format!("rtp:resource-{}", self.id.to_string()),
            "@type": ["vf:EconomicResource", "rtp:ManagedResource"],
            "vf:conformsTo": format!("vf:{}", self.vf_action),
            "vf:accountingQuantity": self.accounting_quantity,
            "vf:primaryAccountable": format!("did:hc:{}", self.primary_accountable.to_string()),
            "vf:currentLocation": self.vf_current_location.as_ref().map(|loc| json!({
                "@type": "vf:SpatialThing",
                "vf:lat": loc.latitude,
                "vf:long": loc.longitude,
                "vf:mappableAddress": loc.address
            })),
            "rtp:transportDimensions": self.transport_dimensions.to_json_ld()?,
            "rtp:lifecycleStage": self.lifecycle_stage.to_string(),
            "created": self.created_at.as_secs()
        }))
    }
}
```

#### 1.3.2 External Interface Serialization

```rust
#[derive(Debug, Clone)]
pub struct ResourceFlowEvent {
    // Core ValueFlows fields (DHT storage)
    pub id: EventHash,
    pub action: Action,                    // Maps to vf:action
    pub resource_inventoried_as: EntryHash, // Maps to vf:resourceInventoriedAs
    pub provider: AgentPubKey,            // Maps to vf:provider
    pub receiver: AgentPubKey,            // Maps to vf:receiver
    pub has_point_in_time: Timestamp,     // Maps to vf:hasPointInTime
    pub has_duration: Option<Duration>,   // Maps to vf:hasDuration

    // JSON-LD semantic mapping (external interface)
    pub vf_action: String,                // e.g., "vf:transport-custody"
    pub vf_accountable_effect: String,    // e.g., "vf:AccountableEffect"
    pub vf_location_effect: String,       // e.g., "vf:LocationEffect"

    // Multi-dimensional tracking (RTP-FP extension)
    pub transport_dimensions: TransportDimensions,

    // PPR integration
    pub participation_receipts: Vec<ReceiptHash>,
    pub commitment_fulfillment: Option<CommitmentHash>,
}

impl ResourceFlowEvent {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@context": [
                "https://w3id.org/valueflows/contexts/vf.jsonld",
                "https://nondominium.org/contexts/rtp.jsonld",
                "https://nondominium.org/contexts/ppr.jsonld"
            ],
            "@id": format!("rtp:transport-event-{}", uuid::Uuid::new_v4()),
            "@type": ["vf:EconomicEvent", "rtp:ResourceFlowEvent"],
            "vf:action": self.vf_action,
            "vf:accountableEffect": self.vf_accountable_effect,
            "vf:locationEffect": self.vf_location_effect,
            "vf:provider": format!("did:hc:{}", self.provider.to_string()),
            "vf:receiver": format!("did:hc:{}", self.receiver.to_string()),
            "vf:resourceInventoriedAs": format!("rtp:resource-{}", self.resource_inventoried_as.to_string()),
            "vf:hasPointInTime": self.has_point_in_time.as_secs(),
            "rtp:transportDimensions": self.transport_dimensions.to_json_ld()?,
            "rtp:pprReceipts": self.participation_receipts.iter()
                .map(|r| format!("did:hc:receipt:{}", r.to_string()))
                .collect::<Vec<_>>()
        }))
    }

    pub fn to_json_ld_document(&self) -> Result<json_ld::syntax::Value, SerializationError> {
        let json_value = self.to_json_ld()?;
        Ok(serde_json_to_json_ld(json_value))
    }
}
```

## 2. Transport Dimensions Implementation

### 2.1 Transport Dimensions Structure

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportDimensions {
    pub physical: PhysicalDimension,
    pub custodial: CustodialDimension,
    pub value: ValueDimension,
    pub legal: LegalDimension,
    pub information: InformationDimension,
    pub timestamp: Timestamp,
}

impl TransportDimensions {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@type": "rtp:TransportDimensions",
            "rtp:physical": self.physical.to_json_ld()?,
            "rtp:custodial": self.custodial.to_json_ld()?,
            "rtp:value": self.value.to_json_ld()?,
            "rtp:legal": self.legal.to_json_ld()?,
            "rtp:information": self.information.to_json_ld()?,
            "rtp:timestamp": self.timestamp.as_secs()
        }))
    }

    pub fn validate_consistency(&self) -> DimensionConsistencyResult {
        let mut result = DimensionConsistencyResult::new();

        // Validate temporal consistency across dimensions
        if !self.temporal_consistency_check() {
            result.add_error("TEMPORAL_INCONSISTENCY");
        }

        // Validate physical-custodial alignment
        if !self.physical_custodial_alignment() {
            result.add_error("PHYSICAL_CUSTODIAL_MISALIGNMENT");
        }

        // Validate value-legal coherence
        if !self.value_legal_coherence() {
            result.add_error("VALUE_LEGAL_INCOHERENCE");
        }

        result
    }
}
```

### 2.2 Physical Dimension Implementation

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicalDimension {
    pub location: Option<LocationData>,
    pub transport_method: TransportMethod,
    pub environmental_conditions: Option<EnvironmentalData>,
    pub movement_metadata: MovementMetadata,
}

impl PhysicalDimension {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        let mut json = json!({
            "@type": "rtp:PhysicalDimension",
            "rtp:transportMethod": self.transport_method.to_string(),
            "rtp:movementMetadata": self.movement_metadata.to_json_ld()?,
            "rtp:timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        });

        if let Some(location) = &self.location {
            json["vf:currentLocation"] = json!({
                "@type": "vf:SpatialThing",
                "vf:lat": location.latitude,
                "vf:long": location.longitude,
                "vf:mappableAddress": location.address.clone()
            });
        }

        if let Some(env) = &self.environmental_conditions {
            json["rtp:environmentalConditions"] = json!(env.to_json_ld()?);
        }

        Ok(json)
    }

    pub fn validate_location_sources(&self, min_sources: usize) -> LocationValidationResult {
        if let Some(location) = &self.location {
            location.validate_with_multiple_sources(min_sources)
        } else {
            LocationValidationResult::missing_location()
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationData {
    pub latitude: f64,
    pub longitude: f64,
    pub address: Option<String>,
    pub altitude: Option<f64>,
    pub accuracy: Option<f64>,
    pub verification_sources: Vec<LocationSource>,
    pub timestamp: Timestamp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LocationSource {
    Gps { accuracy: f64, satellite_count: u8 },
    Rfid { tag_id: String, reader_id: String },
    ManualCheckIn { verified_by: AgentPubKey, notes: Option<String> },
    IpGeolocation { ip_address: String, provider: String },
    Beacon { uuid: String, major: u16, minor: u16, rssi: i8 },
}

impl LocationData {
    pub fn validate_with_multiple_sources(&self, min_sources: usize) -> LocationValidationResult {
        let mut result = LocationValidationResult::new();

        // Check minimum source requirements
        if self.verification_sources.len() < min_sources {
            result.add_error(LocationValidationError::InsufficientSources);
        }

        // Validate coordinate accuracy
        if let Some(accuracy) = self.accuracy {
            if accuracy > 10.0 { // 10 meter accuracy requirement
                result.add_warning(LocationValidationWarning::LowAccuracy);
            }
        }

        // Check timestamp freshness
        let age = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() - self.timestamp.as_secs();

        if age > 300 { // 5 minutes
            result.add_warning(LocationValidationWarning::StaleLocation);
        }

        // Cross-validate between sources
        self.cross_validate_sources(&mut result);

        result
    }

    fn cross_validate_sources(&self, result: &mut LocationValidationResult) {
        // Implementation for cross-validating multiple location sources
        // Checks for consistency between GPS, RFID, manual check-in, etc.
    }
}
```

### 2.3 Custodial Dimension Implementation

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustodialDimension {
    pub current_custodian: AgentPubKey,
    pub custodial_chain: Vec<CustodyTransferRecord>,
    pub custody_start_time: Timestamp,
    pub access_permissions: AccessPermissions,
    pub responsibility_scope: ResponsibilityScope,
}

impl CustodialDimension {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@type": "rtp:CustodialDimension",
            "rtp:currentCustodian": format!("did:hc:{}", self.current_custodian.to_string()),
            "rtp:custodialChain": self.custodial_chain.iter()
                .map(|record| record.to_json_ld())
                .collect::<Result<Vec<_>, _>>()?,
            "rtp:custodyStartTime": self.custody_start_time.as_secs(),
            "rtp:accessPermissions": self.access_permissions.to_json_ld()?,
            "rtp:responsibilityScope": self.responsibility_scope.to_json_ld()?
        }))
    }

    pub fn validate_custody_chain_continuity(&self) -> CustodyChainValidationResult {
        let mut result = CustodyChainValidationResult::new();

        // Check for gaps in chain
        for window in self.custodial_chain.windows(2) {
            let previous = &window[0];
            let current = &window[1];

            // Verify temporal continuity
            if current.timestamp < previous.timestamp {
                result.add_error(CustodyChainError::TemporalViolation);
            }

            // Verify handover completeness
            if !self.verify_handover_completeness(previous, current) {
                result.add_error(CustodyChainError::IncompleteHandover);
            }
        }

        // Check for circular references
        if self.has_circular_references() {
            result.add_error(CustodyChainError::CircularReference);
        }

        result
    }

    fn has_circular_references(&self) -> bool {
        let mut seen_agents = HashSet::new();

        for record in &self.custodial_chain {
            if seen_agents.contains(&record.to_agent) {
                return true;
            }
            seen_agents.insert(record.to_agent);
        }

        false
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustodyTransferRecord {
    pub from_agent: AgentPubKey,
    pub to_agent: AgentPubKey,
    pub timestamp: Timestamp,
    pub transfer_reason: String,
    pub condition_at_transfer: ResourceCondition,
    pub supporting_documents: Vec<DocumentHash>,
    pub transfer_receipt: ReceiptHash,
}

impl CustodyTransferRecord {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@type": "rtp:CustodyTransfer",
            "rtp:fromAgent": format!("did:hc:{}", self.from_agent.to_string()),
            "rtp:toAgent": format!("did:hc:{}", self.to_agent.to_string()),
            "rtp:timestamp": self.timestamp.as_secs(),
            "rtp:transferReason": self.transfer_reason,
            "rtp:conditionAtTransfer": self.condition_at_transfer.to_string(),
            "rtp:transferReceipt": format!("did:hc:receipt:{}", self.transfer_receipt.to_string())
        }))
    }
}
```

### 2.4 Value Dimension Implementation

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueDimension {
    pub current_condition: ResourceCondition,
    pub utilization_metrics: UtilizationMetrics,
    pub maintenance_history: MaintenanceHistory,
    pub depreciation_schedule: DepreciationSchedule,
    pub current_valuation: EconomicValuation,
}

impl ValueDimension {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@type": "rtp:ValueDimension",
            "rtp:currentCondition": self.current_condition.to_json_ld()?,
            "rtp:utilizationMetrics": self.utilization_metrics.to_json_ld()?,
            "rtp:maintenanceHistory": self.maintenance_history.to_json_ld()?,
            "rtp:depreciationSchedule": self.depreciation_schedule.to_json_ld()?,
            "rtp:currentValuation": self.current_valuation.to_json_ld()?
        }))
    }

    pub fn calculate_value_change(&self, old_state: &ValueState, justification: &ValueChangeJustification) -> ValueChangeResult {
        let mut result = ValueChangeResult::new();

        // Calculate condition-based value change
        let condition_change = self.calculate_condition_value_change(&old_state.condition, &self.current_condition);

        // Calculate utilization-based depreciation
        let utilization_depreciation = self.depreciation_schedule.calculate_utilization_depreciation(
            &self.utilization_metrics
        );

        // Calculate time-based depreciation
        let time_depreciation = self.depreciation_schedule.calculate_time_depreciation(
            old_state.timestamp,
            std::time::SystemTime::now()
        );

        let total_change = condition_change + utilization_depreciation + time_depreciation;

        // Validate justification against calculated change
        if !justification.supports_value_change(total_change) {
            result.add_error(ValueError::UnjustifiedValueChange);
        }

        result.set_value_change(total_change);
        result
    }

    fn calculate_condition_value_change(&self, old_condition: &ResourceCondition, new_condition: &ResourceCondition) -> f64 {
        let condition_score_old = old_condition.get_numeric_score();
        let condition_score_new = new_condition.get_numeric_score();

        // Condition value impact (10% of total value per condition grade)
        (condition_score_new - condition_score_old) * 0.1
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResourceCondition {
    Excellent { score: f64, notes: Option<String> },
    Good { score: f64, notes: Option<String> },
    Fair { score: f64, notes: Option<String> },
    Poor { score: f64, notes: Option<String> },
    Damaged { score: f64, damage_description: String, repair_cost: Option<f64> },
}

impl ResourceCondition {
    pub fn get_numeric_score(&self) -> f64 {
        match self {
            ResourceCondition::Excellent { score, .. } => *score,
            ResourceCondition::Good { score, .. } => *score,
            ResourceCondition::Fair { score, .. } => *score,
            ResourceCondition::Poor { score, .. } => *score,
            ResourceCondition::Damaged { score, .. } => *score,
        }
    }

    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        match self {
            ResourceCondition::Excellent { score, notes } => Ok(json!({
                "@type": "rtp:ExcellentCondition",
                "rtp:score": *score,
                "rtp:notes": notes
            })),
            ResourceCondition::Good { score, notes } => Ok(json!({
                "@type": "rtp:GoodCondition",
                "rtp:score": *score,
                "rtp:notes": notes
            })),
            ResourceCondition::Fair { score, notes } => Ok(json!({
                "@type": "rtp:FairCondition",
                "rtp:score": *score,
                "rtp:notes": notes
            })),
            ResourceCondition::Poor { score, notes } => Ok(json!({
                "@type": "rtp:PoorCondition",
                "rtp:score": *score,
                "rtp:notes": notes
            })),
            ResourceCondition::Damaged { score, damage_description, repair_cost } => Ok(json!({
                "@type": "rtp:DamagedCondition",
                "rtp:score": *score,
                "rtp:damageDescription": damage_description,
                "rtp:repairCost": repair_cost
            })),
        }
    }
}
```

### 2.5 Legal and Information Dimensions

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegalDimension {
    pub access_rights: AccessRights,
    pub usage_permissions: UsagePermissions,
    pub regulatory_compliance: ComplianceStatus,
    pub liability_coverage: LiabilityCoverage,
    pub contractual_obligations: Vec<ContractualObligation>,
}

impl LegalDimension {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@type": "rtp:LegalDimension",
            "rtp:accessRights": self.access_rights.to_json_ld()?,
            "rtp:usagePermissions": self.usage_permissions.to_json_ld()?,
            "rtp:regulatoryCompliance": self.regulatory_compliance.to_json_ld()?,
            "rtp:liabilityCoverage": self.liability_coverage.to_json_ld()?,
            "rtp:contractualObligations": self.contractual_obligations.iter()
                .map(|obligation| obligation.to_json_ld())
                .collect::<Result<Vec<_>, _>>()?
        }))
    }

    pub fn validate_legal_permissions(&self, agent: &AgentPubKey, proposed_action: &LegalAction) -> LegalValidationResult {
        let mut result = LegalValidationResult::new();

        // Validate access rights
        if !self.access_rights.permits_action(agent, proposed_action) {
            result.add_error(LegalError::InsufficientAccessRights);
        }

        // Validate usage permissions
        if !self.usage_permissions.permits_usage(agent, proposed_action.usage_type()) {
            result.add_error(LegalError::InsufficientUsagePermissions);
        }

        // Validate regulatory compliance
        if !self.regulatory_compliance.is_compliant_for(agent, proposed_action) {
            result.add_error(LegalError::RegulatoryNonCompliance);
        }

        // Validate liability coverage
        if !self.liability_coverage.covers(agent, proposed_action) {
            result.add_error(LegalError::InsufficientLiabilityCoverage);
        }

        result
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InformationDimension {
    pub documentation: DocumentationSet,
    pub provenance_chain: ProvenanceChain,
    pub digital_twin: Option<DigitalTwinReference>,
    pub audit_trail: AuditTrail,
    pub knowledge_base: KnowledgeBase,
}

impl InformationDimension {
    pub fn to_json_ld(&self) -> Result<Value, SerializationError> {
        Ok(json!({
            "@type": "rtp:InformationDimension",
            "rtp:documentation": self.documentation.to_json_ld()?,
            "rtp:provenanceChain": self.provenance_chain.to_json_ld()?,
            "rtp:digitalTwin": self.digital_twin.as_ref().map(|dt| dt.to_json_ld()).transpose()?,
            "rtp:auditTrail": self.audit_trail.to_json_ld()?,
            "rtp:knowledgeBase": self.knowledge_base.to_json_ld()?
        }))
    }

    pub fn validate_information_completeness(&self, required_documents: &Vec<DocumentType>) -> InfoValidationResult {
        let mut result = InfoValidationResult::new();

        for doc_type in required_documents {
            if let Some(document_status) = self.documentation.get_status(doc_type) {
                if !document_status.is_present_and_valid() {
                    result.add_missing_document(doc_type.clone(), document_status.required_by().clone());
                }

                if document_status.is_expired() {
                    result.add_expired_document(doc_type.clone(), document_status.expiry_date());
                }
            } else {
                result.add_missing_document(doc_type.clone(), "Protocol Requirement".to_string());
            }
        }

        result
    }

    pub fn validate_provenance_integrity(&self, resource_hash: &EntryHash) -> ProvenanceValidationResult {
        let mut result = ProvenanceValidationResult::new();

        // Validate chain continuity
        if !self.provenance_chain.is_continuous(resource_hash) {
            result.add_error(ProvenanceError::ChainBreak {
                break_point: self.provenance_chain.first_break_point(resource_hash),
                missing_links: self.provenance_chain.missing_links(resource_hash),
            });
        }

        // Validate cryptographic integrity
        if !self.provenance_chain.cryptographically_integrity() {
            result.add_error(ProvenanceError::IntegrityViolation {
                affected_events: self.provenance_chain.compromised_events(),
            });
        }

        // Validate temporal consistency
        if !self.provenance_chain.temporally_consistent() {
            result.add_error(ProvenanceError::TemporalInconsistency);
        }

        result
    }
}
```

## 3. PPR Implementation Requirements

### 3.1 Reputation Calculation Engine

```rust
pub struct ReputationCalculator {
    receipt_analyzer: ReceiptAnalyzer,
    reputation_weights: ReputationWeights,
    decay_calculator: DecayCalculator,
    community_feedback: CommunityFeedback,
}

impl ReputationCalculator {
    pub fn new(config: ReputationConfig) -> Self {
        Self {
            receipt_analyzer: ReceiptAnalyzer::new(),
            reputation_weights: ReputationWeights::from_config(config.weights),
            decay_calculator: DecayCalculator::new(config.decay_parameters),
            community_feedback: CommunityFeedback::new(),
        }
    }

    pub fn calculate_reputation(&self, agent: &AgentPubKey, time_window: Duration) -> ReputationScore {
        // Gather receipt history
        let receipts = self.receipt_analyzer.get_receipts_in_window(agent, time_window);

        // Calculate base score from receipts
        let mut base_score = 0.0;
        let mut weight_sum = 0.0;

        for receipt in receipts {
            let performance_score = receipt.performance_metrics.overall_score();
            let weight = self.reputation_weights.weight_for(&receipt.claim_type);
            let decay_factor = self.decay_calculator.calculate_decay(
                receipt.timestamp,
                std::time::SystemTime::now()
            );

            base_score += performance_score * weight * decay_factor;
            weight_sum += weight * decay_factor;
        }

        let normalized_base_score = if weight_sum > 0.0 {
            base_score / weight_sum
        } else {
            DEFAULT_REPUTATION_SCORE
        };

        // Apply community feedback adjustments
        let feedback_adjustment = self.community_feedback.calculate_feedback_adjustment(agent);

        // Calculate final reputation score
        let final_score = (normalized_base_score + feedback_adjustment)
            .clamp(MINIMUM_REPUTATION_SCORE, MAXIMUM_REPUTATION_SCORE);

        ReputationScore {
            score: final_score,
            level: self.determine_reputation_level(final_score),
            receipt_count: receipts.len(),
            last_updated: std::time::SystemTime::now(),
            breakdown: ReputationBreakdown {
                base_score: normalized_base_score,
                feedback_adjustment,
                receipt_count: receipts.len(),
            },
        }
    }

    pub fn determine_validation_level(&self, agent: &AgentPubKey, operation: &Operation) -> ValidationLevel {
        let reputation = self.calculate_reputation(agent, DEFAULT_TIME_WINDOW);
        let required_threshold = self.reputation_weights.threshold_for(operation);

        match reputation.score {
            score if score >= 0.9 => ValidationLevel::Implicit,      // Expert agents
            score if score >= 0.75 => ValidationLevel::Standard,    // Trusted agents
            score if score >= 0.5 => ValidationLevel::Enhanced,    // Established agents
            score if score >= 0.25 => ValidationLevel::Restricted,  // Known agents
            _ => ValidationLevel::Supervised,                     // New/untrusted agents
        }
    }
}

#[derive(Debug, Clone)]
pub struct ReputationScore {
    pub score: f64,           // 0.0 to 1.0
    pub level: ReputationLevel,
    pub receipt_count: usize,
    pub last_updated: std::time::SystemTime,
    pub breakdown: ReputationBreakdown,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ReputationLevel {
    Expert,      // 0.9+
    Trusted,     // 0.75-0.9
    Established, // 0.5-0.75
    Known,       // 0.25-0.5
    New,         // 0.25-
}

#[derive(Debug, Clone)]
pub struct ReputationBreakdown {
    pub base_score: f64,
    pub feedback_adjustment: f64,
    pub receipt_count: usize,
}
```

### 3.2 PPR Receipt Generation System

```rust
pub struct ReceiptGenerator {
    template_registry: ReceiptTemplateRegistry,
    evidence_collector: EvidenceCollector,
    proof_generator: CryptographicProofGenerator,
}

impl ReceiptGenerator {
    pub async fn generate_bidirectional_receipts(&self,
        event: &ResourceFlowEvent,
        provider_context: &ReceiptContext,
        receiver_context: &ReceiptContext) -> Result<ReceiptPair, ReceiptError> {

        // Generate provider receipt
        let provider_receipt = self.generate_receipt(
            &event.provider,
            &event.receiver,
            &event.action,
            provider_context,
            ReceiptRole::Provider
        ).await?;

        // Generate receiver receipt
        let receiver_receipt = self.generate_receipt(
            &event.receiver,
            &event.provider,
            &event.action,
            receiver_context,
            ReceiptRole::Receiver
        ).await?;

        // Validate receipt pair consistency
        self.validate_receipt_pair(&provider_receipt, &receiver_receipt)?;

        Ok(ReceiptPair {
            provider_receipt,
            receiver_receipt,
            generation_timestamp: std::time::SystemTime::now(),
            validation_status: ReceiptPairStatus::Valid,
        })
    }

    async fn generate_receipt(&self,
        claimant: &AgentPubKey,
        counterparty: &AgentPubKey,
        action: &Action,
        context: &ReceiptContext,
        role: ReceiptRole) -> Result<PprReceipt, ReceiptError> {

        // Get appropriate receipt template
        let template = self.template_registry.get_template(action, role)?;

        // Collect evidence
        let evidence = self.evidence_collector.collect_evidence(context).await?;

        // Calculate performance metrics
        let performance_metrics = self.calculate_performance_metrics(evidence.clone())?;

        // Generate cryptographic proof
        let cryptographic_proof = self.proof_generator.generate_proof(
            claimant,
            &template.claim_type,
            &evidence,
            &performance_metrics
        )?;

        Ok(PprReceipt {
            id: ReceiptId::generate(),
            claim_type: template.claim_type,
            claimant: *claimant,
            counterparty: *counterparty,
            performance_metrics,
            evidence,
            timestamp: std::time::SystemTime::now(),
            cryptographic_proof,
            context: context.clone(),
        })
    }

    fn calculate_performance_metrics(&self, evidence: Vec<Evidence>) -> Result<PerformanceMetrics, ReceiptError> {
        let mut metrics = PerformanceMetrics::new();

        // Calculate timeliness score
        metrics.timeliness = self.calculate_timeliness_score(&evidence)?;

        // Calculate completeness score
        metrics.completeness = self.calculate_completeness_score(&evidence)?;

        // Calculate accuracy score
        metrics.accuracy = self.calculate_accuracy_score(&evidence)?;

        // Calculate overall score
        metrics.overall_score = (metrics.timeliness + metrics.completeness + metrics.accuracy) / 3.0;

        Ok(metrics)
    }

    fn validate_receipt_pair(&self, provider_receipt: &PprReceipt, receiver_receipt: &PprReceipt) -> Result<(), ReceiptError> {
        // Validate that receipts are for the same event
        if provider_receipt.context.event_id != receiver_receipt.context.event_id {
            return Err(ReceiptError::EventMismatch);
        }

        // Validate that parties are swapped
        if provider_receipt.claimant != receiver_receipt.counterparty ||
           provider_receipt.counterparty != receiver_receipt.claimant {
            return Err(ReceiptError::PartyMismatch);
        }

        // Validate timestamp proximity
        let time_diff = provider_receipt.timestamp.duration_since(receiver_receipt.timestamp)
            .unwrap_or(std::time::Duration::from_secs(0))
            .as_secs();

        if time_diff > 300 { // 5 minutes
            return Err(ReceiptError::TimestampMismatch);
        }

        Ok(())
    }
}
```

### 3.3 Receipt Data Structures

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PprReceipt {
    pub id: ReceiptId,
    pub claim_type: ClaimType,
    pub claimant: AgentPubKey,
    pub counterparty: AgentPubKey,
    pub performance_metrics: PerformanceMetrics,
    pub evidence: Vec<Evidence>,
    pub timestamp: std::time::SystemTime,
    pub cryptographic_proof: CryptographicProof,
    pub context: ReceiptContext,
}

impl PprReceipt {
    pub fn validate_receipt(&self) -> ReceiptValidationResult {
        let mut result = ReceiptValidationResult::new();

        // Validate cryptographic proof
        if !self.cryptographic_proof.is_valid() {
            result.add_error("INVALID_CRYPTOGRAPHIC_PROOF");
        }

        // Validate timestamp within acceptable window
        if !self.timestamp.is_recent(RECEIPT_VALIDITY_WINDOW) {
            result.add_error("TIMESTAMP_OUT_OF_RANGE");
        }

        // Validate evidence completeness
        let required_evidence = self.claim_type.required_evidence();
        for evidence_type in required_evidence {
            if !self.has_evidence_type(evidence_type) {
                result.add_error(&format!("MISSING_EVIDENCE_{:?}", evidence_type));
            }
        }

        // Validate performance metrics credibility
        if !self.performance_metrics.is_credible() {
            result.add_error("CREDIBLE_PERFORMANCE_METRICS");
        }

        result
    }

    pub fn extract_knowledge(&self) -> ExtractedKnowledge {
        ExtractedKnowledge {
            agent_reliability: self.calculate_reliability_score(),
            performance_patterns: self.extract_performance_patterns(),
            risk_factors: self.identify_risk_factors(),
            collaboration_effectiveness: self.calculate_collaboration_score(),
            expertise_indicators: self.identify_expertise_areas(),
        }
    }

    fn calculate_reliability_score(&self) -> f64 {
        let mut score = 0.0;
        let mut weight_sum = 0.0;

        // Performance score weight
        score += self.performance_metrics.overall_score * 0.4;
        weight_sum += 0.4;

        // Timeliness weight
        score += self.performance_metrics.timeliness * 0.3;
        weight_sum += 0.3;

        // Completeness weight
        score += self.performance_metrics.completeness * 0.2;
        weight_sum += 0.2;

        // Accuracy weight
        score += self.performance_metrics.accuracy * 0.1;
        weight_sum += 0.1;

        if weight_sum > 0.0 {
            score / weight_sum
        } else {
            0.0
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub timeliness: f64,      // 0.0 to 1.0
    pub completeness: f64,    // 0.0 to 1.0
    pub accuracy: f64,        // 0.0 to 1.0
    pub overall_score: f64,   // Weighted average
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClaimType {
    ResourceContribution,
    NetworkValidation,
    CustodyTransfer,
    CustodyAcceptance,
    TransportCommitment,
    TransportFulfillment,
    GoodFaithTransfer,
    MaintenancePerformed,
}

impl ClaimType {
    pub fn required_evidence(&self) -> Vec<EvidenceType> {
        match self {
            ClaimType::ResourceContribution => vec![
                EvidenceType::ResourceSpecification,
                EvidenceType::ConditionReport,
                EvidenceType::OwnershipProof
            ],
            ClaimType::CustodyTransfer => vec![
                EvidenceType::TransferAgreement,
                EvidenceType::ConditionReport,
                EvidenceType::CustodianAuthorization
            ],
            ClaimType::TransportFulfillment => vec![
                EvidenceType::TransportProof,
                EvidenceType::ConditionReport,
                EvidenceType::DeliveryConfirmation
            ],
            // ... other claim types
        }
    }
}
```

## 4. Validation and Governance Implementation

### 4.1 Multi-Layered Validation Pipeline

```rust
pub struct RtpValidationEngine {
    semantic_validator: SemanticValidator,
    business_validator: RtpBusinessValidator,
    holochain_validator: HolochainValidator,
    cross_system_validator: CrossSystemValidator,
    reputation_validator: ReputationValidator,
}

impl RtpValidationEngine {
    pub async fn validate_transport_event(&self, event: &ResourceFlowEvent) -> ComprehensiveValidationResult {
        let mut final_result = ComprehensiveValidationResult::new();

        // Layer 1: Semantic Validation (JSON-LD/SHACL)
        let json_ld_representation = event.to_json_ld()?;
        let semantic_result = self.semantic_validator.validate_resource_flow(&json_ld_representation).await?;
        final_result.add_layer_result("semantic", semantic_result);

        // Layer 2: Business Rule Validation (RTP-FP Governance)
        let business_result = self.business_validator.validate_transport_event(event);
        final_result.add_layer_result("business", business_result);

        // Layer 3: Cryptographic Validation (Holochain)
        let crypto_result = self.holochain_validator.validate_signatures(event);
        final_result.add_layer_result("cryptographic", crypto_result);

        // Layer 4: Cross-System Validation
        let cross_system_result = self.cross_system_validator.validate_external_compliance(event).await?;
        final_result.add_layer_result("cross_system", cross_system_result);

        // Layer 5: Social/Reputation Validation (PPR System)
        let reputation_result = self.reputation_validator.validate_social_consensus(event);
        final_result.add_layer_result("reputation", reputation_result);

        final_result
    }
}

pub struct SemanticValidator {
    shape_registry: HashMap<String, String>,
    json_ld_processor: JsonLdProcessor,
}

impl SemanticValidator {
    pub async fn validate_resource_flow(&self, event: &Value) -> SemanticValidationResult {
        // Expand JSON-LD for semantic analysis
        let expanded = self.json_ld_processor.expand(event).await?;

        // Validate against SHACL shapes
        let shape_validation = self.validate_against_shapes(&expanded)?;

        SemanticValidationResult {
            is_valid: shape_validation.conforms(),
            errors: shape_validation.violations(),
            warnings: shape_validation.warnings(),
        }
    }

    fn validate_against_shapes(&self, expanded: &ExpandedDocument) -> Result<ShaclValidation, SemanticError> {
        let mut validation = ShaclValidation::new();

        // Validate against RTP Transport Event shape
        validation.add_shape_check("rtp:ResourceFlowEvent", RTP_TRANSPORT_EVENT_SHAPE);

        // Validate against core ValueFlows EconomicEvent shape
        validation.add_shape_check("vf:EconomicEvent", VALUEFLOWS_ECONOMIC_EVENT_SHAPE);

        // Execute validation
        validation.validate_against(expanded)
    }
}
```

### 4.2 Governance Rules Engine

```rust
pub struct GovernanceRuleEngine {
    rule_registry: RuleRegistry,
    rule_applicator: RuleApplicator,
    rule_validator: RuleValidator,
    evolution_manager: RuleEvolutionManager,
}

impl GovernanceRuleEngine {
    pub fn apply_rules(&self, event: &ResourceFlowEvent) -> RuleApplicationResult {
        let mut result = RuleApplicationResult::new();

        // Determine applicable rules
        let applicable_rules = self.rule_registry.get_applicable_rules(event);

        for rule in applicable_rules {
            let rule_result = self.rule_applicator.apply_rule(rule, event);

            match rule_result.severity {
                RuleSeverity::Violation => {
                    result.add_violation(rule_result);
                }
                RuleSeverity::Warning => {
                    result.add_warning(rule_result);
                }
                RuleSeverity::Info => {
                    result.add_info(rule_result);
                }
            }
        }

        result
    }

    pub async fn evolve_rules(&mut self, community_feedback: &CommunityFeedback) -> RuleEvolutionResult {
        // Analyze patterns in rule violations
        let violation_patterns = self.rule_analyzer.analyze_violation_patterns()?;

        // Analyze community feedback
        let feedback_analysis = community_feedback.analyze_feedback_patterns().await?;

        // Generate rule evolution proposals
        let proposals = self.evolution_manager.generate_evolution_proposals(
            violation_patterns,
            feedback_analysis
        )?;

        // Community voting on proposals
        let voting_results = self.community_voting.process_proposals(proposals).await?;

        // Apply approved rule changes
        let applied_changes = self.rule_registry.apply_approved_changes(voting_results.approved_changes())?;

        RuleEvolutionResult {
            applied_changes,
            rejected_proposals: voting_results.rejected_proposals(),
            next_evolution_cycle: std::time::Duration::from_secs(86400 * 30), // 30 days
        }
    }
}
```

### 4.3 Dispute Resolution System

```rust
pub struct DisputeResolutionSystem {
    validator_registry: ValidatorRegistry,
    consensus_engine: ConsensusEngine,
    evidence_collector: EvidenceCollector,
    resolution_implementer: ResolutionImplementer,
}

impl DisputeResolutionSystem {
    pub async fn initiate_challenge(&self,
        disputed_event: &ResourceFlowEvent,
        challenger: &AgentPubKey,
        challenge_reason: &ChallengeReason) -> Result<ChallengeResult, DisputeError> {

        // Validate challenge legitimacy
        if !self.validate_challenge_legitimacy(challenger, disputed_event, challenge_reason)? {
            return Err(DisputeError::InvalidChallenge);
        }

        // Select appropriate validators based on expertise and reputation
        let selected_validators = self.validator_registry.select_validators(
            disputed_event,
            MIN_VALIDATORS,
            MAX_VALIDATORS
        )?;

        // Collect evidence from all parties
        let evidence = self.evidence_collector.collect_challenge_evidence(
            disputed_event, challenger, selected_validators.clone()
        ).await?;

        // Conduct validator analysis and voting
        let voting_result = self.consensus_engine.conduct_validator_voting(
            selected_validators,
            evidence,
            disputed_event
        ).await?;

        // Calculate consensus
        let consensus = self.calculate_consensus(voting_result)?;

        if consensus.meets_threshold() {
            // Implement resolution
            let resolution = self.resolution_implementer.implement_resolution(
                disputed_event,
                consensus.resolution,
                consensus.explanation
            ).await?;

            Ok(ChallengeResult::Resolved {
                resolution,
                consensus_score: consensus.score,
                validator_votes: voting_result.votes,
                resolution_implementation: std::time::SystemTime::now(),
            })
        } else {
            // Escalate or continue gathering evidence
            Ok(ChallengeResult::Escalated {
                consensus_score: consensus.score,
                additional_evidence_required: consensus.additional_evidence_needed,
                escalation_path: self.determine_escalation_path(consensus),
            })
        }
    }
}
```

## 5. API Integration Requirements

### 5.1 REST API Implementation

```rust
use actix_web::{get, post, web, HttpResponse, Result};
use serde_json::json;

#[get("/resources/{id}")]
async fn get_resource_json_ld(
    path: web::Path<String>,
    state: web::Data<AppState>
) -> Result<HttpResponse, ApiError> {
    let resource_id = path.into_inner();

    // Retrieve from Holochain DHT
    let resource = state.holochain_client
        .get_resource(&resource_id)
        .await?;

    // Convert to JSON-LD
    let json_ld = resource.to_json_ld()?;

    Ok(HttpResponse::Ok()
        .content_type("application/ld+json")
        .json(json_ld))
}

#[post("/events")]
async fn create_transport_event(
    event_data: web::Json<Value>,
    state: web::Data<AppState>
) -> Result<HttpResponse, ApiError> {
    // Validate against SHACL shapes
    let validation = state.semantic_validator
        .validate_transport_event(&event_data)
        .await?;

    if !validation.is_valid {
        return Err(ApiError::Validation(validation.errors));
    }

    // Convert to internal format
    let event = ResourceFlowEvent::from_json_ld(event_data.into_inner())?;

    // Store in Holochain DHT
    let event_hash = state.holochain_client
        .create_event(event)
        .await?;

    Ok(HttpResponse::Created()
        .content_type("application/ld+json")
        .json(json!({"eventHash": event_hash.to_string()})))
}

#[get("/resources")]
async fn discover_resources(
    query: web::Query<ResourceQuery>,
    state: web::Data<AppState>
) -> Result<HttpResponse, ApiError> {
    // Use semantic query patterns
    let sparql_query = format!(r#"
        PREFIX vf: <https://w3id.org/valueflows/ont/vf#>
        PREFIX rtp: <https://nondominium.org/ontology/rtp#>

        SELECT ?resource ?location ?custodian WHERE {{
            ?resource a vf:EconomicResource .
            ?resource vf:currentLocation ?location .
            ?resource vf:primaryAccountable ?custodian .
            FILTER(?location = ?lat_long)
        }}
    "#);

    let results = state.semantic_store
        .query(&sparql_query)
        .await?;

    Ok(HttpResponse::Ok()
        .content_type("application/ld+json")
        .json(results))
}
```

### 5.2 WebSocket Real-Time Updates

```rust
use tokio::sync::broadcast;

pub struct WebSocketHandler {
    resource_updates: broadcast::Sender<ResourceUpdate>,
    transport_events: broadcast::Sender<TransportEvent>,
    reputation_changes: broadcast::Sender<ReputationChange>,
}

impl WebSocketHandler {
    pub async fn handle_connection(&self,
        mut session: WebSocketSession,
        agent_id: AgentPubKey,
        subscriptions: Vec<SubscriptionType>
    ) -> Result<(), WebSocketError> {

        // Subscribe to requested event streams
        for subscription in subscriptions {
            match subscription {
                SubscriptionType::ResourceUpdates => {
                    let mut resource_rx = self.resource_updates.subscribe();
                    tokio::spawn(async move {
                        while let Ok(update) = resource_rx.recv().await {
                            if update.is_relevant_to_agent(&agent_id) {
                                let message = serde_json::to_string(&update)?;
                                session.send_text(message).await?;
                            }
                        }
                        Ok::<(), WebSocketError>(())
                    });
                }
                SubscriptionType::TransportEvents => {
                    let mut transport_rx = self.transport_events.subscribe();
                    tokio::spawn(async move {
                        while let Ok(event) = transport_rx.recv().await {
                            if event.involves_agent(&agent_id) {
                                let message = serde_json::to_string(&event)?;
                                session.send_text(message).await?;
                            }
                        }
                        Ok::<(), WebSocketError>(())
                    });
                }
                // ... other subscription types
            }
        }

        // Handle incoming messages from client
        while let Some(msg) = session.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(client_message) = serde_json::from_str::<ClientMessage>(&text) {
                        self.handle_client_message(client_message, &agent_id).await?;
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }

        Ok(())
    }
}
```

## 6. Performance and Scalability Requirements

### 6.1 Performance Targets

```rust
pub struct PerformanceTargets {
    // JSON-LD serialization performance
    pub json_ld_serialization_max_ms: u64,
    pub json_ld_deserialization_max_ms: u64,

    // Holochain DHT operations
    pub entry_creation_max_ms: u64,
    pub entry_retrieval_max_ms: u64,
    pub link_creation_max_ms: u64,

    // Validation performance
    pub semantic_validation_max_ms: u64,
    pub business_validation_max_ms: u64,
    pub reputation_calculation_max_ms: u64,

    // Network performance
    pub api_response_max_ms: u64,
    pub websocket_message_latency_max_ms: u64,
}

impl Default for PerformanceTargets {
    fn default() -> Self {
        Self {
            json_ld_serialization_max_ms: 100,
            json_ld_deserialization_max_ms: 150,
            entry_creation_max_ms: 200,
            entry_retrieval_max_ms: 50,
            link_creation_max_ms: 100,
            semantic_validation_max_ms: 300,
            business_validation_max_ms: 200,
            reputation_calculation_max_ms: 500,
            api_response_max_ms: 1000,
            websocket_message_latency_max_ms: 100,
        }
    }
}
```

### 6.2 Caching Strategy

```rust
pub struct CacheManager {
    json_ld_cache: LruCache<String, CachedJsonLd>,
    resource_cache: LruCache<EntryHash, CachedResource>,
    reputation_cache: LruCache<AgentPubKey, CachedReputation>,
    rule_cache: LruCache<String, CachedRules>,
}

impl CacheManager {
    pub fn new(capacities: CacheCapacities) -> Self {
        Self {
            json_ld_cache: LruCache::new(capacities.json_ld_entries),
            resource_cache: LruCache::new(capacities.resource_entries),
            reputation_cache: LruCache::new(capacities.reputation_entries),
            rule_cache: LruCache::new(capacities.rule_entries),
        }
    }

    pub async fn get_json_ld(&mut self, key: &str) -> Option<Value> {
        if let Some(cached) = self.json_ld_cache.get(key) {
            if !cached.is_expired() {
                return Some(cached.data.clone());
            }
        }
        None
    }

    pub async fn cache_json_ld(&mut self, key: String, data: Value, ttl: Duration) {
        let cached = CachedJsonLd {
            data,
            cached_at: std::time::SystemTime::now(),
            ttl,
        };
        self.json_ld_cache.put(key, cached);
    }

    // Similar methods for other cache types...
}
```

## 7. Security Requirements

### 7.1 Cryptographic Security

```rust
pub struct SecurityRequirements {
    pub minimum_key_length: usize,
    pub signature_algorithm: String,
    pub hash_algorithm: String,
    pub encryption_algorithm: String,
    pub certificate_validation: CertificateValidation,
}

impl Default for SecurityRequirements {
    fn default() -> Self {
        Self {
            minimum_key_length: 2048,
            signature_algorithm: "Ed25519".to_string(),
            hash_algorithm: "SHA-256".to_string(),
            encryption_algorithm: "ChaCha20-Poly1305".to_string(),
            certificate_validation: CertificateValidation::Strict,
        }
    }
}

pub struct CryptographicValidator {
    key_manager: KeyManager,
    certificate_validator: CertificateValidator,
    signature_verifier: SignatureVerifier,
}

impl CryptographicValidator {
    pub fn validate_agent_signature(&self,
        agent: &AgentPubKey,
        message: &[u8],
        signature: &[u8]
    ) -> Result<bool, CryptoError> {

        // Verify agent key is valid and not revoked
        if !self.key_manager.is_agent_key_valid(agent)? {
            return Ok(false);
        }

        // Verify signature format and strength
        if !self.signature_verifier.is_signature_format_valid(signature)? {
            return Ok(false);
        }

        // Perform cryptographic signature verification
        let is_valid = self.signature_verifier.verify(agent, message, signature)?;

        Ok(is_valid)
    }

    pub fn validate_receipt_proof(&self, proof: &CryptographicProof) -> Result<bool, CryptoError> {
        // Validate proof structure
        if !proof.is_structure_valid()? {
            return Ok(false);
        }

        // Validate proof timestamp freshness
        if !proof.is_timestamp_fresh(Duration::from_secs(300))? { // 5 minutes
            return Ok(false);
        }

        // Validate proof signature chain
        if !proof.validate_signature_chain(&self.certificate_validator)? {
            return Ok(false);
        }

        Ok(true)
    }
}
```

### 7.2 Access Control

```rust
pub struct AccessControlManager {
    role_manager: RoleManager,
    permission_manager: PermissionManager,
    capability_manager: CapabilityManager,
}

impl AccessControlManager {
    pub fn check_resource_access(&self,
        agent: &AgentPubKey,
        resource: &EntryHash,
        action: &AccessAction
    ) -> Result<bool, AccessError> {

        // Check agent's roles and permissions
        let agent_roles = self.role_manager.get_agent_roles(agent)?;
        let required_permissions = self.permission_manager.get_required_permissions(action)?;

        // Validate agent has necessary permissions
        if !self.permission_manager.agent_has_permissions(agent, &required_permissions)? {
            return Ok(false);
        }

        // Check capability grants
        if !self.capability_manager.check_capability(agent, resource, action)? {
            return Ok(false);
        }

        // Check resource-specific access rules
        if !self.check_resource_specific_rules(agent, resource, action)? {
            return Ok(false);
        }

        Ok(true)
    }

    pub fn grant_capability(&self,
        granter: &AgentPubKey,
        grantee: &AgentPubKey,
        resource: &EntryHash,
        permissions: Vec<Permission>,
        duration: Option<Duration>
    ) -> Result<CapabilityGrant, AccessError> {

        // Validate granter has authority to grant permissions
        if !self.can_grant_permissions(granter, resource, &permissions)? {
            return Err(AccessError::InsufficientAuthority);
        }

        // Create capability grant
        let grant = CapabilityGrant {
            id: CapabilityId::generate(),
            granter: *granter,
            grantee: *grantee,
            resource: *resource,
            permissions,
            granted_at: std::time::SystemTime::now(),
            expires_at: duration.map(|d| std::time::SystemTime::now() + d),
        };

        // Store grant in capability manager
        self.capability_manager.store_grant(grant.clone())?;

        Ok(grant)
    }
}
```

## 8. Testing Requirements

### 8.1 Unit Tests Structure

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use holochain::prelude::*;

    #[test]
    fn test_json_ld_serialization_performance() {
        let event = create_test_transport_event();
        let start = std::time::Instant::now();

        let result = event.to_json_ld();

        let duration = start.elapsed();
        assert!(result.is_ok());
        assert!(duration.as_millis() < 100); // Performance target
    }

    #[test]
    fn test_transport_dimensions_validation() {
        let dimensions = create_test_transport_dimensions();
        let result = dimensions.validate_consistency();

        assert!(result.is_valid());
        assert!(result.errors().is_empty());
    }

    #[test]
    fn test_reputation_calculation() {
        let calculator = ReputationCalculator::new(test_config());
        let agent = AgentPubKey::from_raw_bytes(&[1; 32]);

        let reputation = calculator.calculate_reputation(&agent, Duration::from_secs(86400 * 30));

        assert!(reputation.score >= 0.0);
        assert!(reputation.score <= 1.0);
    }

    #[test]
    fn test_ppr_receipt_validation() {
        let receipt = create_test_ppr_receipt();
        let result = receipt.validate_receipt();

        assert!(result.is_valid());
    }

    #[test]
    fn test_semantic_validation() {
        let validator = SemanticValidator::new();
        let event_json = create_test_event_json();

        let result = futures::executor::block_on(validator.validate_resource_flow(&event_json));

        assert!(result.is_ok());
        assert!(result.unwrap().is_valid);
    }
}
```

### 8.2 Integration Tests

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;
    use holochain::test_utils::conductor_setup::ConductorConfig;

    #[tokio::test]
    async fn test_end_to_end_transport_event() {
        // Set up test conductor
        let config = ConductorConfig::new();
        let conductor = setup_test_conductor(config).await;

        // Create test agents
        let alice = AgentPubKey::from_raw_bytes(&[1; 32]);
        let bob = AgentPubKey::from_raw_bytes(&[2; 32]);

        // Create resource
        let resource = create_test_resource(&alice).await;

        // Create transport event
        let event = ResourceFlowEvent::builder()
            .provider(alice)
            .receiver(bob)
            .resource(resource.id)
            .action(Action::TransportCustody)
            .build();

        // Store event in DHT
        let event_hash = conductor.call("zome_gouvernance", "create_transport_event", event).await?;

        // Verify event was stored
        let retrieved_event: ResourceFlowEvent = conductor.call("zome_gouvernance", "get_transport_event", event_hash).await?;
        assert_eq!(retrieved_event.provider, alice);
        assert_eq!(retrieved_event.receiver, bob);

        // Generate receipts
        let receipt_pair = generate_test_receipts(&retrieved_event).await;

        // Validate receipt generation
        assert!(receipt_pair.provider_receipt.validate_receipt().is_valid());
        assert!(receipt_pair.receiver_receipt.validate_receipt().is_valid());
    }
}
```

## 9. Deployment Requirements

### 9.1 Environment Configuration

```yaml
# docker-compose.yml
version: "3.8"
services:
  rtp-backend:
    build: .
    environment:
      - RUST_LOG=debug
      - DATABASE_URL=postgresql://user:pass@postgres:5432/rtp
      - REDIS_URL=redis://redis:6379
      - ADMIN_PORT=3001
      - CONDUCTOR_CONFIG_PATH=/app/config/conductor-config.yaml
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./config:/app/config
      - ./contexts:/app/contexts

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=rtp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 9.2 Monitoring and Observability

```rust
use prometheus::{Counter, Histogram, Gauge, Registry};

pub struct MetricsCollector {
    pub transport_events_created: Counter,
    pub json_ld_serialization_duration: Histogram,
    pub active_agents: Gauge,
    pub reputation_scores: Histogram,
    pub validation_errors: Counter,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            transport_events_created: Counter::new(
                "rtp_transport_events_created_total",
                "Total number of transport events created"
            ).unwrap(),
            json_ld_serialization_duration: Histogram::with_opts(
                Histogram::opts(
                    "rtp_json_ld_serialization_duration_seconds",
                    "Time spent serializing to JSON-LD"
                ).buckets(vec![0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0])
            ).unwrap(),
            active_agents: Gauge::new(
                "rtp_active_agents",
                "Number of currently active agents"
            ).unwrap(),
            reputation_scores: Histogram::with_opts(
                Histogram::opts(
                    "rtp_reputation_scores",
                    "Reputation scores of agents"
                ).buckets(vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
            ).unwrap(),
            validation_errors: Counter::new(
                "rtp_validation_errors_total",
                "Total number of validation errors"
            ).unwrap(),
        }
    }

    pub fn register_metrics(&self, registry: &Registry) -> Result<(), prometheus::Error> {
        registry.register(Box::new(self.transport_events_created.clone()))?;
        registry.register(Box::new(self.json_ld_serialization_duration.clone()))?;
        registry.register(Box::new(self.active_agents.clone()))?;
        registry.register(Box::new(self.reputation_scores.clone()))?;
        registry.register(Box::new(self.validation_errors.clone()))?;
        Ok(())
    }
}
```

---

_This technical requirements document provides the detailed implementation specifications for RTP-FP. It should be used in conjunction with the stakeholder specification to understand both the user-facing concepts and their technical implementations._

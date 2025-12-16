# User Story: Resource Transaction Process

## Scenario: Two Organizations Sharing Equipment via Tiki Wiki Integration

**Context**: Sensorica (a maker space) and FabLab (a fabrication lab) want to share a CNC machine through their Tiki Wiki platform integration with Nondominium.

---

## 🎯 The Players

### **Sarah** - Sensorica Resource Coordinator

- **Role**: Primary Accountable Agent (Custodian)
- **Goal**: Make expensive equipment available to partner organizations
- **Reputation**: High PPR scores in ResourceValidation and CustodyTransfer

### **Marco** - FabLab Technical Manager

- **Role**: Accountable Agent with Transport & Repair specializations
- **Goal**: Access CNC machine for prototype production
- **Reputation**: Strong performance in TransportService and RepairService

### **The Resource**

- **CNC Machine Model**: Proxxon MF70 (modified)
- **Current Location**: Sensorica Workshop, Montreal
- **Governance Rules**: Requires certified operators, insurance validation

---

## 🔄 Transaction Journey

### **Phase 1: Discovery & Intent (Day 1)**

```mermaid
sequenceDiagram
    participant Marco as Marco (FabLab)
    participant Tiki as Tiki Wiki
    participant ND as Nondominium
    participant Res as Resource Zome
    participant Gov as Governance Zome

    Marco->>Tiki: Search for CNC equipment
    Tiki->>ND: get_all_economic_resources()
    ND->>Res: Query available resources
    Res-->>ND: Return CNC machine specs
    ND-->>Tiki: Resource with governance rules
    Tiki-->>Marco: Display CNC machine details

    Marco->>Tiki: Review governance rules
    Tiki->>ND: get_governance_rule_profile()
    ND->>Gov: Return rules (certification, insurance)
    Marco->>Tiki: Submit AccessForUse commitment
    Tiki->>ND: propose_commitment()
    ND->>Gov: Create commitment
```

**Sarah's Actions**:

1. **Resource Discovery**: Marco searches Tiki Wiki for available fabrication equipment
2. **Governance Review**: Marco reviews CNC machine's embedded governance rules:
   - Requires Transport certification ✅
   - Proof of facility insurance required
   - Minimum 48-hour notice for transport
3. **Intent Signaling**: Marco submits `AccessForUse` commitment through Tiki interface

### **Phase 2: Validation & Trust Building (Day 2)**

```mermaid
sequenceDiagram
    participant Sarah as Sarah (Sensorica)
    participant Tiki as Tiki Wiki
    participant ND as Nondominium
    participant PPR as PPR System

    ND->>Sarah: Notify of new commitment
    Sarah->>Tiki: Review Marco's credentials
    Tiki->>ND: derive_reputation_summary(Marco)
    ND->>PPR: Calculate reputation scores
    PPR-->>ND: Return reputation data (98% on-time, 4.8/5 quality)
    ND-->>Tiki: Display Marco's reputation
    Sarah->>ND: validate_agent_for_custodianship()
    ND->>Gov: Create validation receipt
    Gov-->>Tiki: Commitment approved
```

**Multi-Party Validation**:

1. **Identity Verification**: Sarah validates Marco's credentials and insurance
2. **Capability Check**: System validates Marco's Transport certification
3. **Reputation Assessment**: Sarah reviews Marco's PPR summary:
   - 98% on-time delivery rate
   - 4.8/5 quality score
   - 12 successful transport completions

### **Phase 3: Resource Preparation (Day 3)**

```mermaid
stateDiagram-v2
    [*] --> Active: CNC Machine Available
    Active --> Reserved: Sarah prepares for transport
    Reserved --> ReadyForTransport: Documentation complete

    note right of Reserved
        Resource state update: Active → Reserved
        Transport protocols linked
        Insurance certificate uploaded
    end note
```

**Sarah's Preparation**:

1. **Resource State Update**: Changes CNC from `Active` to `Reserved`
2. **Transport Documentation**: Creates transport checklist and safety protocols
3. **Insurance Coordination**: Uploads facility insurance certificate

### **Phase 4: Transport Process (Day 4)**

```mermaid
sequenceDiagram
    participant Marco as Marco (FabLab)
    participant Sarah as Sarah (Sensorica)
    participant Tiki as Tiki Wiki
    participant ND as Nondominium
    participant Res as Resource Zome
    participant PPR as PPR System

    Marco->>Tiki: Arrive for transport
    Tiki->>ND: initiate_transport_process()
    ND->>Gov: Validate Marco's Transport role
    Sarah->>Tiki: Scan QR code on CNC machine
    Marco->>Tiki: Scan QR code confirmation
    Tiki->>ND: transfer_custody()
    ND->>Res: Update custodian: Sarah → Marco
    ND->>Gov: log_economic_event(TransferCustody)
    Gov->>PPR: issue_participation_receipts()
    PPR-->>ND: Generate PPRs for both agents
    ND-->>Tiki: Update transport status
```

**The Physical Transfer**:

1. **Transport Initiation**: Marco arrives with certified transport equipment
2. **Custody Transfer Ceremony**: Both agents scan QR codes on CNC machine
3. **Multi-Signature Process**: Bilateral cryptographic signatures executed
4. **Real-time Updates**: Tiki Wiki shows live transport status

### **Phase 5: Usage & Monitoring (Week 1-2)**

```mermaid
graph LR
    subgraph "Usage Process"
        A[Start Use] --> B[Log Daily Usage]
        B --> C[Performance Metrics]
        C --> D[PPR Generation]
        D --> E[Quality Monitoring]
    end

    subgraph "PPR Categories"
        F[UseService]
        G[ServiceValidation]
        H[CommitmentFulfillment]
    end

    D --> F
    D --> G
    D --> H
```

**Resource Utilization**:

1. **Use Process Activation**: Marco initiates CNC machine for prototype production
2. **Quality Monitoring**: System tracks usage hours and maintenance needs
3. **Progress Reporting**: Daily usage logs through Tiki interface
4. **Performance Metrics**: Automatic PPR generation for each use session

### **Phase 6: Return & Completion (Day 15)**

```mermaid
sequenceDiagram
    participant Marco as Marco (FabLab)
    participant Sarah as Sarah (Sensorica)
    participant Tiki as Tiki Wiki
    participant ND as Nondominium
    participant PPR as PPR System

    Marco->>Tiki: Complete maintenance checklist
    Tiki->>ND: claim_commitment()
    Marco->>Tiki: Initiate return transport
    Tiki->>ND: initiate_transport_process()
    Sarah->>Tiki: Scan return QR code
    Tiki->>ND: transfer_custody()
    ND->>Res: Update custodian: Marco → Sarah
    Sarah->>Tiki: Inspect and approve return
    Tiki->>ND: validate_specialized_role()
    ND->>Gov: Create validation receipts
    Gov->>PPR: issue_participation_receipts()
    PPR-->>ND: Update reputation scores
    ND-->>Tiki: Transaction complete
```

**Return Process**:

1. **Maintenance Check**: Marco performs routine maintenance and documents condition
2. **Return Transport**: Reverse transport with same validation process
3. **Final Assessment**: Sarah inspects returned equipment
4. **Bilateral PPR Issuance**: Both agents receive participation receipts

---

## 🏆 Transaction Outcomes

### **Immediate Benefits**

- ✅ **Cost Savings**: FabLab saves $15,000 on equipment purchase
- ✅ **Revenue**: Sensorica earns $800 usage fee
- ✅ **Capacity Building**: Both organizations expand fabrication capabilities
- ✅ **Trust Enhancement**: PPR scores improved for both agents

### **Reputation Impact**

```mermaid
graph LR
    subgraph "Before Transaction"
        Sarah_Before[Sarah: 4.7/5<br/>12 PPRs]
        Marco_Before[Marco: 4.6/5<br/>8 PPRs]
    end

    subgraph "Transaction Process"
        Phase1[Discovery & Validation]
        Phase2[Transport Process]
        Phase3[Usage Period]
        Phase4[Return Process]

        Phase1 --> Phase2
        Phase2 --> Phase3
        Phase3 --> Phase4
    end

    subgraph "After Transaction"
        Sarah_After[Sarah: 4.9/5<br/>15 PPRs<br/>+1 CustodyTransfer<br/>+1 GoodFaithTransfer]
        Marco_After[Marco: 4.8/5<br/>11 PPRs<br/>+1 CustodyAcceptance<br/>+1 TransportService]
    end

    Sarah_Before --> Phase1
    Marco_Before --> Phase1
    Phase4 --> Sarah_After
    Phase4 --> Marco_After
```

**Sarah's PPR Updates**:

- +1 CustodyTransfer (outgoing)
- +1 GoodFaithTransfer
- Performance: 5.0/5 reliability score

**Marco's PPR Updates**:

- +1 CustodyAcceptance (incoming)
- +1 TransportService completion
- Performance: 4.9/5 overall satisfaction

### **Network Effects**

- **New Resource Discovery**: Two other organizations express interest in similar sharing
- **Process Optimization**: Transport protocol refined for future transactions
- **Community Building**: Sensorica and FabLab plan collaborative training workshop

---

## 🔗 Web2 Integration Features

### **System Architecture Integration**

```mermaid
graph TB
    subgraph "Web2 Platform Layer"
        Tiki[Tiki Wiki Platform]
        Mobile[Mobile App]
        API[REST API]
    end

    subgraph "Nondominium Core"
        Person[Person Zome]
        Resource[Resource Zome]
        Governance[Governance Zome]
    end

    subgraph "PPR System"
        Claims[Private Participation Claims]
        Reputation[Reputation Summary]
        Crypto[Cryptographic Signatures]
    end

    subgraph "External Systems"
        Inventory[Inventory Management]
        Insurance[Insurance Systems]
        Finance[Financial Reporting]
    end

    Tiki --> API
    Mobile --> API
    API --> Person
    API --> Resource
    API --> Governance

    Governance --> Claims
    Claims --> Reputation
    Reputation --> Crypto

    Resource --> Inventory
    Governance --> Insurance
    API --> Finance

    Person -.-> |Identity Management| Resource
    Resource -.-> |Resource Lifecycle| Governance
    Governance -.-> |Validation & PPR| Person
```

### **Tiki Wiki Interface**

- **Resource Gallery**: Visual catalog with availability calendars
- **Agent Profiles**: Public reputation summaries with privacy controls
- **Workflow Dashboard**: Step-by-step transaction tracking
- **Notification System**: Real-time updates via email and Tiki messages

### **Enterprise Integration**

- **Synchronization**: Resource status synced with inventory management systems
- **Reporting**: Usage analytics and financial reconciliation
- **Compliance**: Automatic audit trail for insurance and regulatory requirements
- **API Access**: RESTful endpoints for custom workflow integrations

### **User Experience**

- **Mobile App**: Field operations with QR code scanning
- **Document Management**: Secure storage of certificates and agreements
- **Communication Hub**: Integrated messaging for coordination
- **Analytics Dashboard**: Usage patterns and cost optimization insights

---

## 💡 Key Innovation Highlights

### **Trust Without Platforms**

- No central authority controlling the resource
- Direct peer-to-peer governance through embedded rules
- Cryptographic reputation that travels with agents

### **Privacy-Preserving Transparency**

- Economic events publicly visible for accountability
- Private operational details protected through capability access
- Selective disclosure of sensitive information

### **Progressive Trust Building**

- Start with basic resource sharing
- Build reputation through successful transactions
- Unlock more complex collaborative opportunities

### **Composable Workflows**

- Transport → Use → Maintenance → Return processes
- Multi-agent coordination for complex projects
- Automated governance enforcement at each step

---

## 🎯 Business Value Proposition

### **Web2 Integration Benefits**

```mermaid
mindmap
  root((Nondominium + Web2))
    Platform Enhancement
      New Revenue Streams
        Transaction fees
        Premium features
      User Engagement
        Reputation system
        Gamified participation
      Network Effects
        Growing ecosystem
        Resource discovery
    Business Value
      Cost Reduction
        Shared access to equipment
        Reduced capital investment
      Risk Management
        Insured transactions
        Clear accountability
      Innovation Enablement
        Democratized access
        Collaborative opportunities
    Technical Features
      Familiar Interface
        Tiki Wiki integration
        Mobile accessibility
      Enterprise Ready
        API integration
        Reporting dashboard
      Trust Layer
        Cryptographic reputation
        Privacy-preserving transparency
```

### **For Web2 Platforms**

- **New Revenue Streams**: Transaction fees and premium features
- **User Engagement**: Increased platform stickiness through reputation
- **Network Effects**: Growing ecosystem of shared resources
- **Competitive Advantage**: Differentiation through decentralized trust

### **For Organizations**

- **Resource Optimization**: Better utilization of expensive equipment
- **Cost Reduction**: Shared access to specialized tools and facilities
- **Risk Management**: Insured transactions with clear accountability
- **Innovation Enablement**: Access to resources without capital investment

### **For the Community**

- **Sustainability**: Reduced waste through resource sharing
- **Accessibility**: Democratized access to expensive equipment
- **Skill Development**: Knowledge sharing through collaboration
- **Economic Resilience**: Distributed resource ownership

---

**This user story demonstrates how Nondominium enables Web2 platforms to transform from simple content management systems into powerful engines for decentralized resource sharing, combining the familiarity of existing platforms with the trust and transparency of blockchain-based governance.**

---

_Transaction completed successfully in 15 days with both organizations reporting high satisfaction and expressing interest in expanding their sharing partnership._

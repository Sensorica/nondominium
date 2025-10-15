# nondominium Documentation

This directory contains the complete documentation for the nondominium project, organized into three main categories to provide clear separation between different types of documentation.

## Documentation Structure

### 📋 [Requirements](./requirements/)
Business-facing documentation describing **WHAT** the system should do.

- **[product-requirements.md](./requirements/product-requirements.md)** - Complete product requirements document with executive summary, objectives, and success criteria
- **[user-stories.md](./requirements/user-stories.md)** - Detailed user stories organized by agent type (Simple, Accountable, Primary Accountable)
- **[governance-requirements.md](./requirements/governance-requirements.md)** - Governance, validation, and security requirements

**Audience**: Business stakeholders, product managers, domain experts, and developers seeking to understand business requirements.

### 🏗️ [Specifications](./specifications/)
Architecture-facing documentation describing **HOW** the system should be built.

#### Core Specifications
- **[technical-specifications.md](./specifications/technical-specifications.md)** - Complete technical specifications with zome structure and data models
- **[api-specifications.md](./specifications/api-specifications.md)** - Detailed API function specifications organized by zome
- **[data-models.md](./specifications/data-models.md)** - Complete data model definitions with field descriptions and relationships
- **[system-architecture.md](./specifications/system-architecture.md)** - System architecture, security model, and design principles

#### UI Specifications
- **[ui/ui-architecture.md](./specifications/ui/ui_architecture.md)** - UI architecture and component structure
- **[ui/ui_design.md](./specifications/ui/ui_design.md)** - UI design specifications and user experience guidelines

#### Zome Specifications
- **[zomes/architecture_overview.md](./specifications/zomes/architecture_overview.md)** - Zome architecture overview and coordination
- **[zomes/person_zome.md](./specifications/zomes/person_zome.md)** - Person zome design specifications
- **[zomes/resource_zome.md](./specifications/zomes/resource_zome.md)** - Resource zome design specifications
- **[zomes/governance_zome.md](./specifications/zomes/governance_zome.md)** - Governance zome design specifications

#### Planning & Integration
- **[implementation_plan.md](./specifications/implementation_plan.md)** - Detailed implementation strategy and planning phases
- **[integration/VfAction_Usage.md](./specifications/integration/VfAction_Usage.md)** - ValueFlows integration and usage patterns
- **[integration/ValueFlowsUML.png](./specifications/integration/ValueFlowsUML.png)** - ValueFlows UML diagram

#### Governance Design
- **[governance.md](./specifications/governance.md)** - Governance model design
- **[private-participation-receipt.md](./specifications/private-participation-receipt.md)** - PPR system design
- **[PPR_Security_Implementation.md](./specifications/PPR_Security_Implementation.md)** - PPR security design

**Audience**: System architects, technical leads, and developers implementing the system.

### 🔧 [Implementation](./implementation/)
Developer-facing documentation describing **HOW** the system is actually built and deployed.

#### Implementation Overview
- **[README.md](./implementation/README.md)** - Complete implementation overview and current status

#### Zome Implementation Guides
- **[zomes/person-zome-implementation.md](./implementation/zomes/person-zome-implementation.md)** - Actual Person zome implementation with function details
- **[zomes/resource-zome-implementation.md](./implementation/zomes/resource-zome-implementation.md)** - Actual Resource zome implementation with function details
- **[zomes/governance-zome-implementation.md](./implementation/zomes/governance-zome-implementation.md)** - Actual Governance zome implementation with PPR system details

#### UI Implementation Status
- **[ui-implementation-status.md](./implementation/ui-implementation-status.md)** - Current UI implementation status and integration needs

#### Testing Infrastructure
- **[testing/Testing_Infrastructure.md](./implementation/testing/Testing_Infrastructure.md)** - Testing infrastructure and setup
- **[testing/TEST_COMMANDS.md](./implementation/testing/TEST_COMMANDS.md)** - Test commands and execution procedures

**Audience**: Developers, DevOps engineers, and technical implementers working on the actual codebase.

## Quick Navigation

### For Business Stakeholders
1. Start with [product-requirements.md](./requirements/product-requirements.md) for overview
2. Review [user-stories.md](./requirements/user-stories.md) for specific user needs
3. Reference [governance-requirements.md](./requirements/governance-requirements.md) for compliance needs

### For System Architects
1. Review [system-architecture.md](./specifications/system-architecture.md) for high-level design
2. Study [technical-specifications.md](./specifications/technical-specifications.md) for detailed specifications
3. Reference [data-models.md](./specifications/data-models.md) for data structures
4. Consult [api-specifications.md](./specifications/api-specifications.md) for interface definitions

### For Developers
1. Start with [implementation-plan.md](./implementation/implementation_plan.md) for development approach
2. Review zome-specific documentation in [implementation/zomes/](./implementation/zomes/)
3. Study UI implementation in [implementation/ui/](./implementation/ui/)
4. Follow testing procedures in [implementation/testing/](./implementation/testing/)

## Document Relationships

```
Requirements → Specifications → Implementation
     ↓               ↓                ↓
  Business        Architecture     Code
  Needs           Design           Base
```

- **Requirements** drive the **Specifications**
- **Specifications** guide the **Implementation**
- **Implementation** validates both **Requirements** and **Specifications**

## Key Concepts

### nondominium Resources
Resources that are organization-agnostic, uncapturable, and natively collaborative, governed through embedded rules and peer validation.

### Agent Types
- **Simple Agent**: Basic user with minimal capabilities
- **Accountable Agent**: Validated user with full economic participation
- **Primary Accountable Agent**: Resource custodian with governance responsibilities

### Economic Processes
Structured activities (Use, Transport, Storage, Repair) that transform Economic Resources.

### Private Participation Receipts (PPRs)
Cryptographically signed receipts that form the foundation of the reputation system.

## Development Status

**Phase 1 (Complete)**: Person management with role-based access control
**Phase 2 (In Progress)**: Resource lifecycle and governance implementation, PPR system

## Getting Started

For new developers:
1. Read the [product-requirements.md](./requirements/product-requirements.md) to understand the project vision
2. Study the [system-architecture.md](./specifications/system-architecture.md) for technical overview
3. Review the [implementation-plan.md](./implementation/implementation_plan.md) for development approach
4. Follow the [testing-infrastructure.md](./implementation/testing/Testing_Infrastructure.md) to set up your development environment

## Contributing

When contributing to the documentation:
- Keep the separation between requirements, specifications, and implementation clear
- Update cross-references when making changes
- Consider the intended audience for each document type
- Maintain consistency in formatting and structure
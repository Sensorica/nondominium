# Nondominium Development Report

## Executive Summary

This document provides a comprehensive overview of the Nondominium project's development progress, tracing its historical evolution from early research in peer production systems to its current implementation as a decentralized resource transfer engine. The report outlines the project's origins, current status, and future roadmap.

## Historical Context and Project Origins

The Nondominium project builds upon more than a decade of research in peer production systems conducted by the Sensorica laboratory. Since 2011, Sensorica has been at the forefront of developing collaborative resource management systems that embody the principles of [Open Value Networks](https://ovn.world/).

### Real-World Validation: PEP Master Venture

A critical milestone in shaping the Nondominium requirements is the [PEP Master venture](https://www.sensorica.co/ventures/scientific-instruments/pep-master), a collaborative project creating open source DIY hardware and software for cystic fibrosis therapy. In collaboration with Sainte Justine Children's Hospital in Montreal and the Breathing Games community, PEP Master is developing a medical device that requires:

- **Trust-based economy model**: A system where trust between doctors and patients is established based on the quality (safety and efficiency) of medical instruments
- **Certainty of provenance**: Digital infrastructure providing proof of origin for device designs
- **On-demand verification**: Methods for validating fabrication quality in distributed manufacturing
- **Contribution accounting**: Fair reward distribution for everyone involved in producing the instruments

This real-world medical device context provides crucial validation for Nondominium's design, particularly around:

- Non-fungible tokens (NFTs) for digital certificates representing device provenance
- Third-generation DLT for contractual and transactional primitives
- Open value network governance models for collaborative ventures

### The NRP-CAS Foundation

In 2013, Sensorica collaborated with Lynn Foster and Bob Haugen to develop the Network Resource Planning and Contribution Accounting System (NRP-CAS). This system was specifically designed to operationalize Open Value Network principles, providing a framework for managing resources and tracking contributions across collaborative projects. The initial prototype was implemented using Django and Python, serving as an internal tool for the laboratory's operations for several years.

However, the NRP-CAS prototype demonstrated stability and security limitations that precluded production deployment. Despite these technical constraints, the project established a crucial theoretical foundation: Foster and Haugen leveraged the NRP-CAS implementation to develop the [Valueflows ontology](https://valueflo.ws/), an extension of [William E. McCarthy's Resource-Event-Agent (REA) framework](https://wiki.p2pfoundation.net/Resource-Event-Agent_Model). This ontology would later become a cornerstone of the Nondominium architecture.

### Evolution to Web 3 and Architecture Refinement

The year 2025 marked a significant milestone with the initiation of TrueCommons, a Web 3 implementation designed to modernize the NRP-CAS concept. TrueCommons leverages Holochain as its underlying infrastructure and incorporates [hREA](https://hrea.io/), the Holochain-native implementation of the Valueflows ontology. The ambitious vision for TrueCommons encompassed a comprehensive implementation of Valueflows to support complete peer production processes.

During the development process, a critical architectural insight emerged: the need to isolate the resource transfer mechanism as a distinct, reusable component. This recognition led to a strategic separation of concerns between two complementary systems.

**Nondominium** serves as the resource transfer and flow engine, designed as an organization-agnostic system that embeds governance rules directly within resource definitions. This approach enables resources to carry their own governance parameters, ensuring that transfer protocols remain consistent regardless of organizational context.

**TrueCommons** builds upon the Nondominium foundation to provide a complete peer production system. It incorporates additional capabilities including contribution accounting, benefit redistribution algorithms, and project management functionalities.

## Current Development Scope

The initial release of Nondominium focuses on validating the core concept of non-proprietary resource transfer systems through the implementation of essential primitives. This first version encompasses three foundational components.

### Core Resource Transfer System

The primary deliverable is a minimal viable implementation of the resource transfer mechanism, demonstrating the feasibility of governance-embedded, non-proprietary resource flows. This system establishes the technical foundation upon which future enhancements will be built.

### Agent Management Foundation

The implementation includes fundamental person agent management capabilities with multi-device support, recognizing that modern collaborative workflows require seamless cross-device functionality.

### Governance-as-Operator Architecture

The Resource and Governance zomes (modules) adopt a "governance as operator" paradigm, wherein resources remain static until explicitly modified through governance actions. This architectural approach ensures that all state transitions are governed by well-defined rules embedded within the resource itself.

### Target Ecosystem Integration

The initial implementation targets the Moss ecosystem (https://moss.social), a peer-to-peer, privacy-first groupware platform designed for small teams. Moss provides an ideal deployment environment as it is built on Holochain and supports Holochain applications, enabling immediate integration and real-world validation of the Nondominium concepts.

## Implementation Status

### Completed Components

**Design and Architecture:** The project team has completed substantial design and architectural work, with comprehensive documentation available in the project's documentation folders. The requirements and specifications sections provide detailed technical guidance for implementation.

**Person Zome:** The Person zome has been fully implemented and tested, including the multi-device support functionality essential for modern collaborative workflows.

**Resource and Governance Zomes:** Basic implementations of both the Resource and Governance zomes have been completed, establishing the foundational structure for the system.

### Remaining Work for Initial Release

**User Interface:** The current implementation consists entirely of Rust Holochain code with Tryorama (Holochain test framework) tests. A user interface has not yet been developed.

**Governance Implementation Refinement:** The Resource and Governance zomes require additional refinement, particularly to fully realize the "governance as operator" concept. This includes ensuring that all resource state transitions properly enforce governance rules and that the governance mechanism operates effectively as the system's operator.

## Post-MVP Development Roadmap

Following the completion of the initial release, the project team has identified several strategic enhancements designed to extend Nondominium's capabilities and establish it as a foundational technology for peer production systems.

### Protocol Standardization

A primary objective is to standardize the Nondominium resource transfer system as a formal protocol, with the long-term vision of establishing it as an ISO standard for peer production systems. Documentation of this protocol is available in the `resource-transport-flow-protocol` specification.

### Digital Resource Integrity

The team plans to implement a Digital Resource Integrity feature designed to ensure the authenticity and integrity of resources throughout their lifecycle. This capability will provide cryptographic proof that downloaded resource data remains identical to the original data uploaded to the Holochain DHT, addressing concerns about data integrity in distributed systems. Further details are available in the `digital-resource-integrity` specification.

### Valueflows Domain-Specific Language

To enable more sophisticated resource management, the team is developing a Valueflows Domain-Specific Language (DSL). This DSL will facilitate the scripted definition and management of resource flows and transactions, enabling automated resource allocation and distribution based on predefined rules. The `valueflows-dsl` specification provides additional technical details on this initiative.

---

_Last updated: January 2026_

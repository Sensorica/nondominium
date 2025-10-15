# nondominium - User Stories

## Overview
This document contains the user stories and use cases for the nondominium system, extracted from the main product requirements document.

## Simple Agent User Stories

### Identity & Onboarding

**REQ-USER-S-01**: As a Simple Agent, I want to use the nondominium hApp with minimal effort and without permission

**REQ-USER-S-02**: As a Simple Agent, I want to complete my identity by associating private information (legal name, address, email, photo ID) with my Agent identity, stored as Holochain private entries

### Resource Discovery

**REQ-USER-S-03**: As a Simple Agent, I want to search for available nondominium Resources and their specifications

**REQ-USER-S-04**: As a Simple Agent, I want to search for other Agents, view their public profiles and roles

### Resource Creation

**REQ-USER-S-05**: As a Simple Agent, I want to create new nondominium Resources with embedded governance rules

**REQ-USER-S-06**: As a Simple Agent, I want to interact with Agents interested in accessing my created Resources

### First Transaction & Promotion

**REQ-USER-S-07**: As a Simple Agent, I want to make my first transaction, transferring my new Resource to an Accountable Agent

**REQ-USER-S-08**: As a Simple Agent, I want to become an Accountable Agent after my first transaction is validated

## Accountable Agent User Stories

### Resource Access

**REQ-USER-A-01**: As an Accountable Agent, I want to search for available nondominium Resources and their governance rules

**REQ-USER-A-02**: As an Accountable Agent, I want to search for other Agents and view their reputation summaries

**REQ-USER-A-03**: As an Accountable Agent, I want to create new nondominium Resources with embedded governance rules

**REQ-USER-A-04**: As an Accountable Agent, I want to signal intent to access Resources for specific Economic Processes (Use, Transport, Storage, Repair)

### Role & Process Management

**REQ-USER-A-05**: As an Accountable Agent, I want to acquire specialized roles (Transport, Repair, Storage) through validation

**REQ-USER-A-06**: As an Accountable Agent, I want to initiate and complete Economic Processes according to my roles

**REQ-USER-A-07**: As an Accountable Agent, I want to chain multiple process actions (e.g., transport → repair → transport) in a single commitment

### Validation & Governance

**REQ-USER-A-08**: As an Accountable Agent, I want to validate new Resources during first access events

**REQ-USER-A-09**: As an Accountable Agent, I want to validate Agent identity information and first transactions

**REQ-USER-A-10**: As an Accountable Agent, I want to validate Economic Process completions and outcomes

### Reputation & Participation

**REQ-USER-A-11**: As an Accountable Agent, I want to receive Private Participation Receipts for all my economic interactions

**REQ-USER-A-12**: As an Accountable Agent, I want to view my reputation summary and participation history

**REQ-USER-A-13**: As an Accountable Agent, I want to cryptographically sign participation claims to ensure authenticity

## Primary Accountable Agent (Custodian) User Stories

### Custodial Responsibilities

**REQ-USER-P-01**: As a Primary Accountable Agent, I want all capabilities of an Accountable Agent

**REQ-USER-P-02**: As a Primary Accountable Agent, I want to apply governance rules programmatically for access decisions

**REQ-USER-P-03**: As a Primary Accountable Agent, I want to manage Resource custody transfers with full audit trails

### Advanced Governance

**REQ-USER-P-04**: As a Primary Accountable Agent, I want to validate specialized role requests from other Agents

**REQ-USER-P-05**: As a Primary Accountable Agent, I want to participate in dispute resolution processes

**REQ-USER-P-06**: As a Primary Accountable Agent, I want to initiate Resource end-of-life processes with proper validation

## Economic Process User Stories

### Core Process Types

**REQ-PROC-01**: As an Accountable Agent, I want to initiate Use processes for accessing Resources without consuming them

**REQ-PROC-02**: As an Agent with Transport role, I want to initiate transport processes to move Resources between locations

**REQ-PROC-03**: As an Agent with Storage role, I want to initiate storage processes for temporary Resource custody

**REQ-PROC-04**: As an Agent with Repair role, I want to initiate repair processes that may change Resource state

### Process Management

**REQ-PROC-05**: As an Agent, I want to initiate processes only when I have appropriate roles

**REQ-PROC-06**: As an Agent, I want all processes to be tracked with status, inputs, outputs, and completion state

**REQ-PROC-07**: As an Agent, I want process completions to be validated according to process-specific requirements

**REQ-PROC-08**: As an Agent with multiple roles, I want to chain process actions within a single commitment

**REQ-PROC-09**: As an Agent, I want complete audit trail of all processes affecting each Resource
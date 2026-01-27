# ERP-Holochain Bridge: Connecting ERPs to Nondominium

## 1. Introduction

This document outlines a strategy for bridging traditional Enterprise Resource Planning (ERP) systems with Nondominium's peer-to-peer resource-sharing infrastructure. The goal is to enable organizations using centralized ERP systems to participate in decentralized resource economies without abandoning their existing business infrastructure.

**Key Architectural Principle**: The bridge is designed as a **reusable, ERP-agnostic Protocol Bridge** that can serve multiple ERP systems (ERPLibre, Dolibarr, ERPNext, etc.), while ERP-specific integration logic resides in dedicated modules for each platform.

## 2. Problem Statement

### 2.1 The Challenge

Organizations currently manage their inventory, equipment, and resources using centralized ERP systems (e.g., Odoo, SAP, ERPNext). While these systems excel at internal management, they create **data silos** that prevent resource sharing across organizational boundaries.

**Current limitations:**
- **No cross-organizational visibility**: Organization A cannot see if Organization B has idle equipment that could be borrowed.
- **Trust barriers**: Ad-hoc resource sharing requires manual coordination, legal contracts, and trust-building overhead.
- **Platform dependency**: Centralized marketplaces (e.g., equipment rental platforms) extract rent and control access.
- **Data sovereignty concerns**: Organizations are reluctant to upload sensitive inventory data to third-party platforms.

### 2.2 The Opportunity

Nondominium offers a **peer-to-peer, organization-agnostic** resource-sharing layer that can complement existing ERP systems:
- Resources can be **selectively published** from ERP inventory to Nondominium without migrating away from the ERP.
- Organizations retain **full sovereignty** over their data and participation.
- **Reputation tracking (PPR system)** replaces heavy legal contracts with cryptographic accountability.
- **Emergent coordination** via stigmergy reduces the need for manual negotiation.

## 3. Agent Model: Organization as Holochain Agent

### 3.1 Key Architectural Distinction

In the ERP-Holochain bridge architecture, the **organization is the Holochain agent**, not individual end-users. This differs from typical Holochain applications where each person runs their own node.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NONDOMINIUM DHT NETWORK                              │
│                                                                             │
│    ┌──────────────────────┐              ┌──────────────────────┐           │
│    │ Organization A       │              │ Organization B       │           │
│    │ (Holochain Agent)    │◄────────────►│ (Holochain Agent)    │           │
│    └──────────┬───────────┘              └──────────┬───────────┘           │
│               │                                     │                       │
└───────────────┼─────────────────────────────────────┼───────────────────────┘
                │                                     │
     ┌──────────▼───────────┐            ┌────────────▼─────────┐
     │ Org A Server         │            │ Org B Server         │
     │ ┌─────────────────┐  │            │ ┌─────────────────┐  │
     │ │ Holochain Node  │  │            │ │ Holochain Node  │  │
     │ │ (Org A Agent)   │  │            │ │ (Org B Agent)   │  │
     │ ├─────────────────┤  │            │ ├─────────────────┤  │
     │ │ Protocol Bridge │  │            │ │ Protocol Bridge │  │
     │ ├─────────────────┤  │            │ ├─────────────────┤  │
     │ │ ERP System      │  │            │ │ ERP System      │  │
     │ └─────────────────┘  │            │ └─────────────────┘  │
     └──────────┬───────────┘            └───────────┬──────────┘
                │                                    │
         ┌──────┴──────┐                     ┌───────┴─────┐
         │             │                     │             │
      ┌──▼──┐       ┌──▼──┐               ┌──▼──┐       ┌──▼──┐
      │User │       │User │               │User │       │User │
      │ A1  │       │ A2  │               │ B1  │       │ B2  │
      └─────┘       └─────┘               └─────┘       └─────┘

      End-users (employees)               End-users (employees)
      Traditional web clients             Traditional web clients
```

### 3.2 Why Organization-Level Agents

| Aspect | Individual Agents (Typical Holochain) | Organization Agents (ERP Bridge) |
|--------|---------------------------------------|----------------------------------|
| **Node operator** | End-user | Organization's IT infrastructure |
| **Identity** | Personal keypair | Organizational keypair |
| **End-user access** | Direct to conductor | Mediated via ERP |
| **Key management** | User responsibility | IT administration |
| **PPR accountability** | Individual reputation | Organizational reputation |

**Benefits of this model:**
1. **Organizational sovereignty**: The organization controls its participation in the network
2. **Existing authentication**: ERP handles employee authentication/authorization
3. **Single source of truth**: One agent key per organization, not hundreds
4. **Operational simplicity**: IT manages one node, not per-employee nodes
5. **PPR accountability**: Reputation tied to organization, matching business relationships

### 3.3 Trust Model

```
End-user (employee)
    │
    │ Trusts organization (employment relationship)
    ▼
Organization's ERP System
    │
    │ Authenticates & authorizes actions
    ▼
Organization's Holochain Agent
    │
    │ Cryptographically signs all DHT actions
    ▼
Nondominium Network
    │
    │ PPR tracks organizational reputation
    ▼
Other Organizations
```

The end-user **delegates** their participation to the organization. The organization is the **accountable party** in the peer-to-peer network.

## 4. The ERPLibre Context

### 4.1 What is ERPLibre?

[ERPLibre](https://github.com/ERPLibre/ERPLibre) is an open-source "soft fork" of **Odoo Community Edition**, released under the AGPLv3 license. It automates deployment, development, and maintenance of Odoo.

**Key characteristics:**
- **Language**: Python (backend), JavaScript (frontend)
- **Architecture**: Monolithic web application with PostgreSQL database
- **Modules**: Inventory management, sales, purchases, accounting, manufacturing
- **API**: XML-RPC and JSON-RPC endpoints
- **Deployment**: Docker-based, with `docker-compose.yml` for easy setup

### 4.2 ERPLibre Inventory Management

ERPLibre (via Odoo) manages inventory through:
- **Product Templates**: Define product specifications (SKU, name, category, unit of measure)
- **Product Variants**: Specific instances of products (size, color, etc.)
- **Stock Locations**: Warehouses, storage zones, etc.
- **Stock Moves**: Transfers between locations, with full traceability
- **Quants**: Quantities on hand for each product/location combination

**Relevant Odoo Models:**
- `product.product`: Individual products
- `stock.quant`: Available quantities per location
- `stock.move`: Movement history and planned transfers
- `stock.warehouse`: Physical locations

## 5. The Nondominium Context

### 5.1 What Nondominium Offers

Nondominium is a **Holochain-based, ValueFlows-compliant** application for distributed resource management:
- **Agent-centric**: Each organization runs its own node
- **Peer-to-peer**: No central server; resources exist in a shared DHT
- **Embedded governance**: Rules are encoded in `ResourceSpecifications`
- **Reputation layer**: Private Participation Receipts (PPRs) track reliability

### 5.2 Key Data Structures

To bridge ERP inventory to Nondominium, we need to map:

| ERP Concept | Nondominium Concept | Notes |
|-------------|---------------------|-------|
| Product Template | `ResourceSpecification` | Defines what can be shared |
| Product Variant | `EconomicResource` | Specific instance available for sharing |
| Stock Location | Resource `location` field | Where the resource is physically located |
| Available Quantity | `quantity` in `EconomicResource` | How much is available |
| Stock Move | `EconomicEvent` (Transfer, Use) | History of resource movements |

## 6. Bridge Architecture

### 6.1 Two-Layer Architecture

The bridge architecture separates concerns into two distinct layers:

1. **Protocol Bridge** (Reusable): A thin, ERP-agnostic adapter that translates HTTP to Holochain's WebSocket protocol
2. **ERP Module** (Per-ERP): Contains business logic, data mapping, and UI integration specific to each ERP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERP-SPECIFIC MODULES (BFF-like Layer)               │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ ERPLibre Module │  │ Dolibarr Module │  │ ERPNext Module  │              │
│  │ (Python/Odoo)   │  │ (PHP)           │  │ (Python/Frappe) │              │
│  │                 │  │                 │  │                 │              │
│  │ • UI views      │  │ • UI views      │  │ • UI views      │              │
│  │ • Data mapping  │  │ • Data mapping  │  │ • Data mapping  │              │
│  │ • BFF logic     │  │ • BFF logic     │  │ • BFF logic     │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                       │
│           │ HTTP/JSON          │ HTTP/JSON          │ HTTP/JSON             │
│           │                    │                    │                       │
└───────────┼────────────────────┼────────────────────┼───────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SHARED PROTOCOL BRIDGE (Node.js)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Generic REST API                                 │    │
│  │                                                                     │    │
│  │  POST /api/v1/zome/:zome/:fn    → Call any zome function            │    │
│  │  GET  /api/v1/resources         → List resources                    │    │
│  │  GET  /api/v1/resources/:hash   → Get specific resource             │    │
│  │  POST /api/v1/commitments       → Create commitment                 │    │
│  │  GET  /api/v1/events            → List economic events              │    │
│  │  POST /api/v1/webhooks          → Register signal callbacks         │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ WebSocket
                                 ▼
                    ┌───────────────────────┐
                    │ Holochain Conductor   │
                    │ (Nondominium hApp)    │
                    └───────────────────────┘
```

### 6.2 Why This Separation?

| Layer | Responsibility | Changes When... |
|-------|---------------|-----------------|
| **ERP Module** | Business logic, data aggregation, UI | ERP-specific needs change |
| **Protocol Bridge** | HTTP ↔ WebSocket translation, signing | Holochain API changes |

**Benefits:**
- **Reusability**: One bridge serves multiple ERPs
- **Separation of concerns**: Protocol complexity isolated from business logic
- **Independent evolution**: Bridge and modules can be updated independently
- **Testing**: Each layer can be tested in isolation

### 6.3 ERP Module as BFF-like Layer

The ERP module acts as a **Backend for Frontend (BFF)** pattern within the ERP's architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERP MODULE (per ERP)                        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. DATA AGGREGATION                                        │ │
│  │    Combine ERP inventory data with Nondominium resources   │ │
│  │    Join local stock with cross-org availability            │ │
│  │    Merge PPR reputation with supplier/customer records     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 2. DATA MAPPING                                            │ │
│  │    ERP Product → Nondominium ResourceSpecification         │ │
│  │    ERP Stock   → Nondominium EconomicResource              │ │
│  │    ERP Order   → Nondominium Commitment                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 3. UI INTEGRATION                                          │ │
│  │    "Share Resource" button in inventory view               │ │
│  │    "Discover Resources" menu item                          │ │
│  │    "Request Resource" workflow                             │ │
│  │    PPR reputation dashboard                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 4. WEBHOOK HANDLER                                         │ │
│  │    Receive signals from bridge                             │ │
│  │    Update ERP records accordingly                          │ │
│  │    Notify users of resource requests                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Security Architecture

The Protocol Bridge runs **server-side only**. It must never be exposed to end-users directly.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC INTERNET                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (public)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER-SIDE (Private Network)                 │
│                                                                         │
│   ┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐    │
│   │ ERP System  │ HTTP │ Protocol Bridge │  WS  │ Holochain        │    │
│   │ (Python/PHP)│─────▶│ (Node.js)       │─────▶│ Conductor        │    │
│   └─────────────┘      └─────────────────┘      └──────────────────┘    │
│         │                      │                         │              │
│   Public:8069          localhost:3000            localhost:8888         │
│         │                      │                         │              │
│   ┌─────▼─────┐                │                  ┌──────▼───────┐      │
│   │ Database  │                │                  │ Agent Keys   │      │
│   │           │                │                  │ (Protected)  │      │
│   └───────────┘                │                  └──────────────┘      │
│                                │                                        │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
                         🔒 NEVER EXPOSED
```

**Security Requirements:**

| Concern | Risk if Violated | Mitigation |
|---------|------------------|------------|
| **Agent Private Keys** | Identity theft, impersonation | Keys stay on server, never transmitted |
| **Conductor WebSocket** | Unauthorized zome calls | Localhost only, firewalled |
| **Capability Tokens** | Unauthorized actions | Generated and used server-side |
| **Zome Call Signing** | Forged transactions | Signing happens in bridge |

## 7. Protocol Bridge Options

### 7.1 Option 1: HTTP Gateway (`hc-http-gw`)

**Description**: The [Holochain HTTP Gateway](https://github.com/holochain/hc-http-gw) exposes Holochain zome functions as REST endpoints, allowing traditional HTTP clients to interact with Holochain apps.

**Architecture:**
```
ERP Module (Python/PHP) <--HTTP--> hc-http-gw <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**How it works:**
1. `hc-http-gw` connects to the Holochain conductor via admin WebSocket
2. Configured to allow specific zome functions (e.g., `create_economic_resource`, `get_all_resources`)
3. Exposes these functions as HTTP endpoints: `GET /[dna_hash]/[app_id]/[zome]/[function]`
4. ERP module makes HTTP requests to read/write data

**Pros:**
- ✅ **Language-agnostic**: Works with any HTTP client (Python, PHP, Ruby, etc.)
- ✅ **Simple integration**: No need for complex WebSocket management
- ✅ **RESTful**: Familiar paradigm for web developers
- ✅ **Zero custom code**: Pre-built solution
- ✅ **Reusable**: Same gateway serves multiple ERPs

**Cons:**
- ❌ **No signal support**: HTTP is request-response; no native signal/webhook support
- ❌ **Extra service**: Requires running and maintaining `hc-http-gw` as a separate process
- ❌ **Limited zome call signing**: May require pre-authorized capability tokens
- ❌ **Less flexible**: Cannot add custom caching, batching, or business logic

**Best For:**
- Proof of concept and rapid prototyping
- Simple, periodic sync scenarios
- Organizations wanting minimal custom code

### 7.2 Option 2: Node.js Protocol Bridge (`holochain-client-js`)

**Description**: A custom Node.js service using the official [@holochain/client](https://github.com/holochain/holochain-client-js) library. This is the **recommended production approach**.

**Architecture:**
```
ERP Module (Python/PHP) <--HTTP/JSON--> Node.js Bridge <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**How it works:**
1. Node.js Express/Fastify server wraps `@holochain/client`
2. Exposes generic REST endpoints for zome function calls
3. Handles WebSocket connection lifecycle, zome call signing, and signal subscriptions
4. Forwards Holochain signals to registered webhook endpoints

**Example Bridge Implementation:**
```javascript
// bridge/src/server.ts
import { AppWebsocket } from '@holochain/client';
import express from 'express';

const app = express();
const webhooks = new Map();  // URL -> event types

// Initialize Holochain connection
const appWs = await AppWebsocket.connect({
  url: 'ws://localhost:8888',
  token: process.env.HOLOCHAIN_TOKEN
});

// Generic zome call endpoint - works for ANY ERP
app.post('/api/v1/zome/:zome/:fn', async (req, res) => {
  const { zome, fn } = req.params;
  const result = await appWs.callZome({
    zome_name: zome,
    fn_name: fn,
    payload: req.body
  });
  res.json(result);
});

// Webhook registration for signals
app.post('/api/v1/webhooks', async (req, res) => {
  const { url, events } = req.body;
  webhooks.set(url, events);
  res.json({ status: 'registered' });
});

// Subscribe to Holochain signals and forward to webhooks
appWs.on('signal', async (signal) => {
  for (const [url, events] of webhooks) {
    if (events.includes(signal.type)) {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signal)
      });
    }
  }
});

app.listen(3000);
```

**Pros:**
- ✅ **Full feature support**: Access to all `@holochain/client` features
- ✅ **Signal support**: Can subscribe to Holochain signals and push via webhooks
- ✅ **Maintained library**: Official Holochain client with ongoing support
- ✅ **Flexible**: Can add caching, batching, rate limiting, logging
- ✅ **Reusable**: Same bridge serves multiple ERPs

**Cons:**
- ❌ **Extra language**: Requires Node.js runtime
- ❌ **Custom code**: Need to write and maintain the bridge service
- ❌ **More moving parts**: Additional service to deploy and monitor

**Best For:**
- Production deployments
- Scenarios requiring real-time signal handling
- When you need full control over the integration

### 7.3 Option 3: Direct Python WebSocket Client (Future)

**Description**: A native Python library that directly communicates with the Holochain conductor using the Conductor API protocol.

**Architecture:**
```
ERP Module (Python) <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**Potential for Python Ecosystem Integration:**

A native Python client would unlock significant integrations with Python's rich ecosystem:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PYTHON ECOSYSTEM + HOLOCHAIN                            │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Machine Learning│  │ Data Science    │  │ AI/LLM          │              │
│  │ ─────────────── │  │ ─────────────── │  │ ─────────────── │              │
│  │ • TensorFlow    │  │ • pandas        │  │ • LangChain     │              │
│  │ • PyTorch       │  │ • NumPy         │  │ • OpenAI SDK    │              │
│  │ • scikit-learn  │  │ • Jupyter       │  │ • Anthropic SDK │              │
│  │ • Hugging Face  │  │ • matplotlib    │  │ • AutoGPT       │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                ▼                                            │
│                 ┌──────────────────────────────┐                            │
│                 │ Python Holochain Client      │                            │
│                 │ (holochain-client-py)        │                            │
│                 └──────────────┬───────────────┘                            │
│                                │                                            │
│  ┌─────────────────┐  ┌────────┴──────┐  ┌─────────────────┐                │
│  │ Big Data        │  │               │  │ Automation      │                │
│  │ ─────────────── │  │   Holochain   │  │ ─────────────── │                │
│  │ • PySpark       │  │   Conductor   │  │ • Airflow       │                │
│  │ • Dask          │  │               │  │ • Celery        │                │
│  │ • Ray           │  └───────────────┘  │ • Prefect       │                │
│  └─────────────────┘                     └─────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Use Cases Enabled by Python Client:**

| Use Case | Description |
|----------|-------------|
| **ML-Powered PPR Scoring** | Train reputation models on economic event history |
| **AI Resource Matching** | LangChain agents that discover and request resources |
| **Predictive Analytics** | Forecast resource demand using time-series analysis |
| **Federated Learning** | Privacy-preserving ML across organizations |
| **Jupyter Notebooks** | Interactive data exploration of DHT data |
| **Data Pipelines** | Airflow/Prefect workflows processing economic events |

**Implementation Requirements:**
```
holochain_client_py/
├── __init__.py
├── websocket.py      # WebSocket connection management
├── conductor_api.py  # Conductor protocol implementation
├── signing.py        # Ed25519 signing (cryptography lib)
├── types.py          # Holochain data types (ActionHash, AgentPubKey, etc.)
└── async_client.py   # High-level async/await API
```

**Pros:**
- ✅ **Single language**: Pure Python solution for Python-based ERPs
- ✅ **Ecosystem access**: Direct integration with ML/AI/Data tools
- ✅ **No bridge overhead**: Direct connection to conductor
- ✅ **Community value**: Benefits entire Holochain ecosystem

**Cons:**
- ❌ **Protocol complexity**: Must implement and maintain Conductor API protocol
- ❌ **Signing complexity**: Ed25519 signing and capability management
- ❌ **Maintenance burden**: No official support; community-maintained
- ❌ **Compatibility risk**: Must track Holochain protocol changes

**Best For:**
- Long-term investment in Python-Holochain integration
- ML/AI-heavy use cases (PPR scoring, demand forecasting)
- Organizations committed to maintaining a Python client

## 8. Comparison Matrix

| Criterion | HTTP Gateway | Node.js Bridge | Python Client |
|-----------|--------------|----------------|---------------|
| **Ease of Implementation** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐⭐ Medium-High | ⭐⭐ Low |
| **Signal Support** | ❌ No | ✅ Yes | ✅ Yes (if implemented) |
| **Maintenance Burden** | ⭐⭐⭐⭐⭐ Very Low | ⭐⭐⭐⭐ Low | ⭐⭐ High |
| **Multi-ERP Reusability** | ✅ Yes | ✅ Yes | ⚠️ Python ERPs only |
| **Real-time Capability** | ❌ No | ✅ Yes | ✅ Yes |
| **Zome Call Signing** | ⚠️ Limited | ✅ Full support | ✅ Full (if implemented) |
| **ML/AI Integration** | ❌ No | ❌ No | ✅ Native |
| **Production Readiness** | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Experimental |

## 9. Multi-ERP Support

### 9.1 Compatible ERP Systems

The Protocol Bridge architecture supports integration with multiple ERP systems:

| ERP | Language | Module Type | Integration Effort |
|-----|----------|-------------|-------------------|
| **ERPLibre/Odoo** | Python | Odoo Module | Medium |
| **Dolibarr** | PHP | Dolibarr Module | Medium |
| **ERPNext** | Python/JS | Frappe App | Medium |
| **Tryton** | Python | Tryton Module | Medium |
| **Metasfresh** | Java | Plugin | Higher |
| **Apache OFBiz** | Java | Component | Higher |
| **Custom ERP** | Any | HTTP client | Low |

### 9.2 What's Reusable vs. ERP-Specific

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| **Protocol Bridge** | ✅ 100% | Generic HTTP↔WebSocket adapter |
| **Zome Function API** | ✅ 100% | Same Nondominium API for all |
| **Signal/Webhook System** | ✅ 100% | Any HTTP endpoint can receive |
| **Data Mapping** | ❌ ERP-specific | Each ERP has different data models |
| **UI Integration** | ❌ ERP-specific | Each ERP has different frontend |
| **Business Logic** | ❌ ERP-specific | BFF layer per ERP |

### 9.3 Example: Dolibarr Module

```php
// dolibarr/htdocs/custom/nondominium/class/bridge.class.php

class NondominiumBridge {
    private $bridge_url = 'http://localhost:3000/api/v1';

    /**
     * Map Dolibarr product to Nondominium ResourceSpecification
     */
    public function mapProductToSpec($product) {
        return [
            'name' => $product->label,
            'description' => $product->description,
            'default_unit' => $this->mapUnit($product->fk_unit),
            'governance_rules' => $this->getDefaultGovernance()
        ];
    }

    /**
     * Publish product to Nondominium network
     */
    public function publishResource($product, $quantity) {
        // Create spec first
        $spec = $this->callBridge('POST', '/zome/zome_resource/create_resource_specification',
            $this->mapProductToSpec($product)
        );

        // Then create resource
        $resource = $this->callBridge('POST', '/zome/zome_resource/create_economic_resource', [
            'conforms_to' => $spec['hash'],
            'quantity' => $quantity,
            'unit' => $this->mapUnit($product->fk_unit)
        ]);

        return $resource;
    }

    /**
     * Discover available resources from network
     */
    public function discoverResources() {
        return $this->callBridge('GET', '/resources');
    }

    private function callBridge($method, $endpoint, $data = null) {
        // HTTP client implementation
    }
}
```

### 9.4 ERPLibre Module Structure

```
nondominium_bridge/
├── __manifest__.py           # Odoo module manifest
├── models/
│   ├── nondominium_resource.py    # Transient model for cross-org resources
│   ├── nondominium_commitment.py  # Commitment tracking
│   └── res_partner_ppr.py         # PPR reputation on partners
├── controllers/
│   └── webhook_controller.py      # Receive Holochain signals
├── views/
│   ├── shareable_resources.xml    # Cross-org resource discovery
│   ├── resource_requests.xml      # Commitment management UI
│   └── ppr_dashboard.xml          # Reputation dashboard
├── wizards/
│   └── publish_resource_wizard.py # "Share to Nondominium" workflow
└── static/
    └── src/js/
        └── nondominium_widgets.js # Real-time update widgets
```

## 10. Recommended Approach

### 10.1 For Proof of Concept: HTTP Gateway (`hc-http-gw`)

**Rationale:**
- **Speed to prototype**: Get a working demo in hours, not days
- **Simplicity**: Use familiar `requests` library
- **Zero custom bridge code**: Pre-built solution
- **Proof, not production**: PoC doesn't need real-time signals

**Implementation Steps:**
1. Deploy ERPLibre using Docker
2. Deploy Holochain conductor and Nondominium hApp
3. Deploy `hc-http-gw` and configure it to expose Nondominium zome functions
4. Write a simple ERPLibre module that:
   - Queries ERPLibre inventory via Odoo's ORM
   - Maps products to Nondominium `ResourceSpecification` format
   - POSTs to `hc-http-gw` to create `EconomicResource` entries
5. Demo cross-organizational resource discovery

### 10.2 For Production: Node.js Protocol Bridge

**Rationale:**
- **Full feature support**: Signals, proper signing, webhooks
- **Official support**: `@holochain/client` is actively maintained
- **Multi-ERP ready**: Same bridge serves ERPLibre, Dolibarr, etc.
- **Scalability**: Can add caching, batching, monitoring

**Migration Path:**
1. Deploy Node.js bridge alongside `hc-http-gw`
2. Update ERPLibre module to call bridge instead of gateway
3. Implement webhook handler for Holochain signals
4. Add proper zome call signing and capability management
5. Deprecate `hc-http-gw` once bridge is stable

### 10.3 For Future: Python Client (If ML/AI Becomes Central)

**Rationale:**
- **PPR Intelligence**: ML-powered reputation scoring
- **Resource Matching**: AI agents for optimal allocation
- **Predictive Analytics**: Demand forecasting

**Decision Criteria:**
- Invest in Python client when ML/analytics becomes core to PPR system
- Consider as community contribution benefiting entire Holochain ecosystem

## 11. Proof of Concept Scope

### 11.1 Minimal Viable Demonstration

**Objective**: Demonstrate that inventory from two organizations running ERPLibre can be synchronized to Nondominium and made discoverable for sharing.

**Scenario:**
1. **Organization A** has a 3D printer listed in its ERPLibre inventory
2. **Organization B** has a laser cutter listed in its ERPLibre inventory
3. Both organizations **publish** their available equipment to Nondominium
4. Each organization can **discover** the other's equipment via Nondominium
5. Organization B initiates a **Use process** for Organization A's 3D printer
6. The usage is **recorded** as an `EconomicEvent` in Nondominium
7. The usage is **reflected back** to Organization A's ERPLibre as a "Loan" or "External Use" stock move

### 11.2 Requirements

**Functional Requirements:**
- **FR-1**: Read inventory data from ERPLibre via its API
- **FR-2**: Map ERPLibre products to Nondominium `ResourceSpecification` entries
- **FR-3**: Publish selected inventory items as `EconomicResource` entries in Nondominium
- **FR-4**: Query Nondominium for available resources from other organizations
- **FR-5**: Initiate a `Use` process in Nondominium for a discovered resource
- **FR-6**: Record the `EconomicEvent` and generate PPRs for both parties

**Non-Functional Requirements:**
- **NFR-1**: The bridge should not require modifications to ERPLibre core code
- **NFR-2**: The bridge should be deployable as a separate service/container
- **NFR-3**: Real-time synchronization is not required (periodic sync is acceptable)
- **NFR-4**: Bidirectional sync (changes in Nondominium updating ERP)

### 11.3 Out of Scope (for PoC)

- Complex governance rules enforcement
- Financial transactions or invoicing
- Multi-warehouse scenarios
- Full PPR reputation dashboard
- Multi-ERP support (Dolibarr, ERPNext)

## 12. Implementation Plan

### Phase 1: Environment Setup (Week 1)
- ✅ Deploy ERPLibre with Docker
- ✅ Deploy Holochain conductor and Nondominium
- ✅ Deploy `hc-http-gw`
- ✅ Create test inventory in ERPLibre (2 organizations, 3-5 products each)

### Phase 2: Bridge Development (Week 2)
- ✅ Write Python script to read ERPLibre inventory
- ✅ Implement mapping logic (ERPLibre → Nondominium)
- ✅ Test POST requests to `hc-http-gw`
- ✅ Verify resources appear in Nondominium DHT

### Phase 3: Cross-Organizational Discovery (Week 3)
- ✅ Implement resource discovery query from Python
- ✅ Display discovered resources in ERPLibre UI (or simple web page)
- ✅ Implement "Request Use" button that creates a Commitment in Nondominium
- ✅ Record the Use event and verify PPR generation

### Phase 4: Demo and Documentation (Week 4)
- ✅ Record video demonstration
- ✅ Write integration guide
- ✅ Document API mappings and data flow diagrams
- ✅ Identify next steps for production implementation

## 13. Example Code Snippets

### 13.1 Reading ERPLibre Inventory (Python)

```python
import xmlrpc.client

# Connect to ERPLibre
url = 'http://localhost:8069'
db = 'erplibre_db'
username = 'admin'
password = 'admin'

common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})

models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

# Read products with available quantity
products = models.execute_kw(db, uid, password,
    'product.product', 'search_read',
    [[('qty_available', '>', 0)]],
    {'fields': ['name', 'default_code', 'qty_available', 'uom_id']}
)

for product in products:
    print(f"Product: {product['name']}, Qty: {product['qty_available']}")
```

### 13.2 Posting to Nondominium via HTTP Gateway (Python)

```python
import requests
import json

DNA_HASH = "uhC0k..."  # Your Nondominium DNA hash
GW_URL = "http://localhost:8090"

# Map ERPLibre product to Nondominium ResourceSpecification
resource_spec_payload = {
    "name": product['name'],
    "description": f"SKU: {product['default_code']}",
    "governance_rules": []
}

# Create ResourceSpecification
spec_response = requests.post(
    f"{GW_URL}/{DNA_HASH}/nondominium/zome_resource/create_resource_specification",
    json=resource_spec_payload
)
spec_hash = spec_response.json()

# Create EconomicResource
resource_payload = {
    "conforms_to": spec_hash,
    "quantity": product['qty_available'],
    "unit": product['uom_id'][1]  # Unit of measure name
}

resource_response = requests.post(
    f"{GW_URL}/{DNA_HASH}/nondominium/zome_resource/create_economic_resource",
    json=resource_payload
)
print(f"Created resource: {resource_response.json()}")
```

### 13.3 Discovering Resources (Python)

```python
# Query all available resources
resources_response = requests.get(
    f"{GW_URL}/{DNA_HASH}/nondominium/zome_resource/get_all_resources"
)

resources = resources_response.json()
for resource in resources:
    print(f"Available: {resource['quantity']} {resource['unit']} of {resource['conforms_to']}")
```

## 14. Deployment Topology

### Option A: Bridge Per Organization (Recommended)

Each organization runs its own full stack:

```
┌─────────────────────────┐     ┌─────────────────────────┐
│ Org A Server            │     │ Org B Server            │
│ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │
│ │ ERPLibre + Module   │ │     │ │ Dolibarr + Module   │ │
│ ├─────────────────────┤ │     │ ├─────────────────────┤ │
│ │ Protocol Bridge     │ │     │ │ Protocol Bridge     │ │
│ ├─────────────────────┤ │     │ ├─────────────────────┤ │
│ │ Holochain Node      │ │     │ │ Holochain Node      │ │
│ │ (Org A Agent)       │ │     │ │ (Org B Agent)       │ │
│ └─────────────────────┘ │     │ └─────────────────────┘ │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            └───────────────────────────────┘
                        DHT Network
```

**Deployment (docker-compose.yml):**
```yaml
services:
  erplibre:
    image: erplibre/erplibre:latest
    ports:
      - "8069:8069"  # Public: ERPLibre web UI
    networks:
      - internal
    depends_on:
      - protocol-bridge

  protocol-bridge:
    build: ./bridge
    # NO public ports - internal only
    networks:
      - internal
    environment:
      - HOLOCHAIN_URL=ws://holochain:8888
    depends_on:
      - holochain

  holochain:
    image: holochain/holochain:latest
    # NO public ports - internal only
    networks:
      - internal
    volumes:
      - ./agent-keys:/keys  # Protected volume
      - ./happ:/happ

networks:
  internal:
    internal: true  # No external access
```

### Option B: Shared Bridge Service (Managed)

For organizations that prefer managed infrastructure:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ERPLibre    │     │ Dolibarr    │     │ ERPNext     │
│ Org A       │     │ Org B       │     │ Org C       │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                  ┌────────▼────────┐
                  │ Managed Bridge  │  ← Multi-tenant
                  │ Service         │     API key per org
                  └────────┬────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
      ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
      │ Org A Node  │ │Org B Node│ │ Org C Node  │
      └─────────────┘ └──────────┘ └─────────────┘
```

## 15. Next Steps After PoC

1. **Bidirectional sync**: Reflect Nondominium events back to ERPLibre (e.g., mark equipment as "On Loan")
2. **Authentication**: Implement proper Holochain agent key management per organization
3. **UI integration**: Build native ERPLibre module for seamless UX
4. **Governance**: Allow organizations to set access rules via ERPLibre UI
5. **PPR dashboard**: Display reputation scores and participation history in ERPLibre
6. **Production bridge**: Deploy Node.js bridge for signal support and better performance
7. **Multi-ERP**: Develop modules for Dolibarr, ERPNext based on shared bridge
8. **Python client**: Evaluate investment in native Python client for ML/AI integration

## 16. References

- [ERPLibre GitHub](https://github.com/ERPLibre/ERPLibre)
- [Dolibarr GitHub](https://github.com/Dolibarr/dolibarr)
- [Holochain HTTP Gateway](https://github.com/holochain/hc-http-gw)
- [Holochain Client JS](https://github.com/holochain/holochain-client-js)
- [Odoo API Documentation](https://www.odoo.com/documentation/16.0/developer/reference/external_api.html)
- [ValueFlows Ontology](https://www.valueflows.org/)
- [Nondominium Requirements](../requirements/requirements.md)
- [Nondominium Specifications](../specifications/specifications.md)

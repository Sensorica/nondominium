# ERP-Holochain Bridge: Connecting ERPLibre to Nondominium

## 1. Introduction

This document outlines a strategy for bridging traditional Enterprise Resource Planning (ERP) systems with Nondominium's peer-to-peer resource-sharing infrastructure. The goal is to enable organizations using centralized ERP systems to participate in decentralized resource economies without abandoning their existing business infrastructure.

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

## 3. The ERPLibre Context

### 3.1 What is ERPLibre?

[ERPLibre](https://github.com/ERPLibre/ERPLibre) is an open-source "soft fork" of **Odoo Community Edition**, released under the AGPLv3 license. It automates deployment, development, and maintenance of Odoo.

**Key characteristics:**
- **Language**: Python (backend), JavaScript (frontend)
- **Architecture**: Monolithic web application with PostgreSQL database
- **Modules**: Inventory management, sales, purchases, accounting, manufacturing
- **API**: XML-RPC and JSON-RPC endpoints
- **Deployment**: Docker-based, with `docker-compose.yml` for easy setup

### 3.2 ERPLibre Inventory Management

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

## 4. The Nondominium Context

### 4.1 What Nondominium Offers

Nondominium is a **Holochain-based, ValueFlows-compliant** application for distributed resource management:
- **Agent-centric**: Each organization runs its own node
- **Peer-to-peer**: No central server; resources exist in a shared DHT
- **Embedded governance**: Rules are encoded in `ResourceSpecifications`
- **Reputation layer**: Private Participation Receipts (PPRs) track reliability

### 4.2 Key Data Structures

To bridge ERP inventory to Nondominium, we need to map:

| ERP Concept | Nondominium Concept | Notes |
|-------------|---------------------|-------|
| Product Template | `ResourceSpecification` | Defines what can be shared |
| Product Variant | `EconomicResource` | Specific instance available for sharing |
| Stock Location | Resource `location` field | Where the resource is physically located |
| Available Quantity | `quantity` in `EconomicResource` | How much is available |
| Stock Move | `EconomicEvent` (Transfer, Use) | History of resource movements |

## 5. Proof of Concept Scope

### 5.1 Minimal Viable Demonstration

**Objective**: Demonstrate that inventory from two organizations running ERPLibre can be synchronized to Nondominium and made discoverable for sharing.

**Scenario:**
1. **Organization A** has a 3D printer listed in its ERPLibre inventory
2. **Organization B** has a laser cutter listed in its ERPLibre inventory
3. Both organizations **publish** their available equipment to Nondominium
4. Each organization can **discover** the other's equipment via Nondominium
5. Organization B initiates a **Use process** for Organization A's 3D printer
6. The usage is **recorded** as an `EconomicEvent` in Nondominium
7. The usage is **reflected back** to Organization A's ERPLibre as a "Loan" or "External Use" stock move

### 5.2 Requirements

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

### 5.3 Out of Scope (for PoC)

- Complex governance rules enforcement
- Financial transactions or invoicing
- Multi-warehouse scenarios
- Full PPR reputation dashboard

## 6. Bridge Architecture Analysis

### 6.1 Option 1: HTTP Gateway (`hc-http-gw`)

**Description**: The [Holochain HTTP Gateway](https://github.com/holochain/hc-http-gw) exposes Holochain zome functions as REST endpoints, allowing traditional HTTP clients to interact with Holochain apps.

**Architecture:**
```
ERPLibre (Python) <--HTTP--> hc-http-gw <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**How it works:**
1. `hc-http-gw` connects to the Holochain conductor via admin WebSocket
2. Configured to allow specific zome functions (e.g., `create_economic_resource`, `get_all_resources`)
3. Exposes these functions as HTTP endpoints: `GET /[dna_hash]/[app_id]/[zome]/[function]`
4. Python code in ERPLibre (or a bridge service) makes HTTP requests to read/write data

**Example Request:**
```bash
curl -X POST http://localhost:8090/[DNA_HASH]/nondominium/zome_resource/create_economic_resource \
  -H "Content-Type: application/json" \
  -d '{"spec_hash": "...", "quantity": 1, "unit": "unit"}'
```

**Pros:**
- ✅ **Language-agnostic**: Works with any HTTP client (Python, PHP, Ruby, etc.)
- ✅ **Simple integration**: No need for complex WebSocket management in Python
- ✅ **RESTful**: Familiar paradigm for web developers
- ✅ **Stateless**: Each request is independent

**Cons:**
- ❌ **Read-only signals**: HTTP is request-response; no native signal support
- ❌ **Extra service**: Requires running and maintaining `hc-http-gw` as a separate process
- ❌ **Limited zome call signing**: May require pre-authorized capability tokens
- ❌ **Latency**: Additional HTTP layer adds overhead

**Best For:**
- Simple, periodic sync scenarios
- Organizations uncomfortable with WebSocket programming
- When bidirectional real-time updates are not required

### 6.2 Option 2: JavaScript Client with Node.js Bridge (`holochain-client-js`)

**Description**: The [@holochain/client](https://github.com/holochain/holochain-client-js) library connects to Holochain via WebSocket. While it's JavaScript-based, we can create a Node.js service that acts as a bridge between Python and Holochain.

**Architecture:**
```
ERPLibre (Python) <--HTTP/JSON--> Node.js Bridge (holochain-client-js) <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**How it works:**
1. Create a Node.js Express/Fastify server that wraps `@holochain/client`
2. Expose REST endpoints that internally call Holochain zome functions
3. Python code in ERPLibre calls these REST endpoints
4. Node.js bridge handles WebSocket connection, zome call signing, and signal subscriptions

**Example Node.js Bridge:**
```javascript
import { AppWebsocket } from '@holochain/client';
import express from 'express';

const app = express();
const appWs = await AppWebsocket.connect({ url: 'ws://localhost:8888', token: '...' });

app.post('/create_resource', async (req, res) => {
  const result = await appWs.callZome({
    cell_id: req.body.cell_id,
    zome_name: 'zome_resource',
    fn_name: 'create_economic_resource',
    payload: req.body.payload
  });
  res.json(result);
});

app.listen(3000);
```

**Pros:**
- ✅ **Full feature support**: Access to all `@holochain/client` features (signals, zome call signing, etc.)
- ✅ **Signal support**: Can subscribe to Holochain signals and push to Python via webhooks or SSE
- ✅ **Maintained library**: Official Holochain client with ongoing support
- ✅ **Flexible**: Can customize the bridge logic (caching, batching, etc.)

**Cons:**
- ❌ **Extra language**: Requires Node.js runtime alongside Python
- ❌ **Custom bridge code**: Need to write and maintain the bridge service
- ❌ **Complexity**: More moving parts (Python, Node.js, Holochain)

**Best For:**
- Scenarios requiring real-time signal handling
- When you need full control over zome call signing and capability management
- Organizations comfortable with polyglot architectures

### 6.3 Option 3: Direct Python WebSocket Client

**Description**: Implement a Python WebSocket client that directly communicates with the Holochain conductor using the Conductor API protocol.

**Architecture:**
```
ERPLibre (Python) <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**How it works:**
1. Use Python libraries like `websockets` or `aiohttp` to connect to the Holochain conductor
2. Implement the Conductor API message protocol (JSON-RPC over WebSocket)
3. Handle zome call signing using Python cryptography libraries (Ed25519)
4. Integrate directly into ERPLibre or as a Python-based bridge service

**Pros:**
- ✅ **Single language**: Pure Python solution
- ✅ **No extra services**: Direct integration
- ✅ **Full control**: Complete control over the protocol implementation

**Cons:**
- ❌ **Protocol complexity**: Need to implement and maintain the Conductor API protocol
- ❌ **Signing complexity**: Ed25519 signing and capability management in Python
- ❌ **Maintenance burden**: No official Python client; must maintain compatibility with Holochain updates
- ❌ **Testing overhead**: More code to test and debug

**Best For:**
- Organizations that want a pure-Python solution
- Long-term projects willing to invest in maintaining a Python client
- Scenarios where JavaScript/Node.js is not an option

### 6.4 Option 4: gRPC/Protocol Buffers Bridge (Future)

**Description**: If Holochain were to support gRPC, it could provide language-agnostic, high-performance RPC.

**Status**: Currently not supported by Holochain. Mentioned for completeness.

## 7. Comparison Matrix

| Criterion | HTTP Gateway | JS Client + Node Bridge | Direct Python Client |
|-----------|--------------|-------------------------|----------------------|
| **Ease of Implementation** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐ Medium | ⭐⭐ Low |
| **Signal Support** | ❌ No | ✅ Yes | ✅ Yes (if implemented) |
| **Maintenance Burden** | ⭐⭐⭐⭐ Low | ⭐⭐⭐ Medium | ⭐ High |
| **Language Diversity** | ✅ Any HTTP client | ⚠️ Python + Node.js | ✅ Python only |
| **Real-time Capability** | ❌ No | ✅ Yes | ✅ Yes |
| **Zome Call Signing** | ⚠️ Limited | ✅ Full support | ✅ Full (if implemented) |
| **Latency** | ⭐⭐ Medium | ⭐⭐⭐ Low | ⭐⭐⭐⭐ Very Low |
| **Deployment Complexity** | ⭐⭐⭐ 2 services | ⭐⭐ 3 services | ⭐⭐⭐⭐ 1 service |

## 8. Recommended Approach

### 8.1 For Proof of Concept: HTTP Gateway (`hc-http-gw`)

**Rationale:**
- **Speed to prototype**: Get a working demo in hours, not days
- **Simplicity**: Python developers can use familiar `requests` library
- **Proof, not production**: PoC doesn't need real-time signals or complex signing

**Implementation Steps:**
1. Deploy ERPLibre using Docker
2. Deploy Holochain conductor and Nondominium hApp
3. Deploy `hc-http-gw` and configure it to expose Nondominium zome functions
4. Write a Python script (or Odoo module) that:
   - Queries ERPLibre inventory via Odoo's ORM or XML-RPC API
   - Maps products to Nondominium `ResourceSpecification` format
   - POSTs to `hc-http-gw` to create `EconomicResource` entries
5. Demo cross-organizational resource discovery

### 8.2 For Production: JavaScript Client + Node.js Bridge

**Rationale:**
- **Full feature support**: Once PoC is validated, production needs signals and proper signing
- **Official support**: `@holochain/client` is actively maintained
- **Scalability**: Node.js bridge can handle concurrent requests, caching, batching

**Migration Path:**
1. Replace direct `hc-http-gw` calls with calls to the Node.js bridge
2. Add signal subscription to push updates to ERPLibre via webhooks
3. Implement proper zome call signing and capability management
4. Add monitoring, logging, and error handling

## 9. Proof of Concept Implementation Plan

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

## 10. Example Code Snippets

### 10.1 Reading ERPLibre Inventory (Python)

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

### 10.2 Posting to Nondominium via HTTP Gateway (Python)

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

### 10.3 Discovering Resources (Python)

```python
# Query all available resources
resources_response = requests.get(
    f"{GW_URL}/{DNA_HASH}/nondominium/zome_resource/get_all_resources"
)

resources = resources_response.json()
for resource in resources:
    print(f"Available: {resource['quantity']} {resource['unit']} of {resource['conforms_to']}")
```

## 11. Next Steps After PoC

1. **Bidirectional sync**: Reflect Nondominium events back to ERPLibre (e.g., mark equipment as "On Loan")
2. **Authentication**: Implement proper Holochain agent key management per organization
3. **UI integration**: Build native ERPLibre module for seamless UX
4. **Governance**: Allow organizations to set access rules via ERPLibre UI
5. **PPR dashboard**: Display reputation scores and participation history in ERPLibre
6. **Production bridge**: Migrate to Node.js bridge for signal support and better performance

## 12. References

- [ERPLibre GitHub](https://github.com/ERPLibre/ERPLibre)
- [Holochain HTTP Gateway](https://github.com/holochain/hc-http-gw)
- [Holochain Client JS](https://github.com/holochain/holochain-client-js)
- [Odoo API Documentation](https://www.odoo.com/documentation/16.0/developer/reference/external_api.html)
- [ValueFlows Ontology](https://www.valueflows.org/)
- [Nondominium Requirements](../requirements/requirements.md)
- [Nondominium Specifications](../specifications/specifications.md)

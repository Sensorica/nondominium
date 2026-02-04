# ERP-Holochain Bridge: Connecting ERPLibre to Nondominium

## 1. Introduction

This document outlines a strategy for bridging traditional Enterprise Resource Planning (ERP) systems with Nondominium's peer-to-peer resource-sharing infrastructure using a **Node.js Bridge Service** powered by the official `@holochain/client` library. The goal is to enable organizations using centralized ERP systems to participate in decentralized resource economies without abandoning their existing business infrastructure.

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

## 5. Implementation Scope

### 5.1 Minimal Viable Demonstration

**Objective**: Demonstrate that inventory from two organizations running ERPLibre can be synchronized to Nondominium and made discoverable for sharing.

**Scenario:**
1. **Organization A** has a 3D printer listed in its ERPLibre inventory
2. **Organization B** has a laser cutter listed in its ERPLibre inventory
3. Both organizations **publish** their available equipment to Nondominium via the Node.js Bridge
4. Each organization can **discover** the other's equipment via Nondominium
5. Organization B initiates a **Use process** for Organization A's 3D printer
6. The usage is **recorded** as an `EconomicEvent` in Nondominium
7. Real-time **signals** notify Organization A of the resource usage
8. The usage is **reflected back** to Organization A's ERPLibre as a "Loan" or "External Use" stock move

### 5.2 Requirements

**Functional Requirements:**
- **FR-1**: Read inventory data from ERPLibre via its API
- **FR-2**: Map ERPLibre products to Nondominium `ResourceSpecification` entries
- **FR-3**: Publish selected inventory items as `EconomicResource` entries in Nondominium
- **FR-4**: Query Nondominium for available resources from other organizations
- **FR-5**: Initiate a `Use` process in Nondominium for a discovered resource
- **FR-6**: Record the `EconomicEvent` and generate PPRs for both parties
- **FR-7**: Subscribe to Holochain signals for real-time updates
- **FR-8**: Handle bidirectional sync (Nondominium → ERPLibre)

**Non-Functional Requirements:**
- **NFR-1**: The bridge should not require modifications to ERPLibre core code
- **NFR-2**: The bridge should be deployable as a separate service/container
- **NFR-3**: Support real-time synchronization via WebSocket signals
- **NFR-4**: Handle proper zome call signing and capability management
- **NFR-5**: Provide caching, batching, and retry logic

## 6. Bridge Architecture: Node.js Bridge Service

### 6.1 Architecture Overview

The bridge uses a **Node.js service** that wraps the official `@holochain/client` library to provide a RESTful API for ERPLibre while maintaining full WebSocket connectivity to Holochain.

**Architecture:**
```
ERPLibre (Python) <--HTTP/JSON--> Node.js Bridge (@holochain/client) <--WebSocket--> Holochain Conductor <--> Nondominium DHT
```

**Key Components:**
1. **Node.js Bridge Service**: Express/Fastify server exposing RESTful endpoints
2. **@holochain/client**: Official Holochain WebSocket client
3. **Webhook Handler**: Push real-time signals from Holochain to ERPLibre
4. **Cache Layer**: Redis for frequently accessed data
5. **Queue System**: Bull/BullMQ for async operations

### 6.2 Why Node.js Bridge?

**Advantages:**
- ✅ **Full feature support**: Access to all `@holochain/client` features (signals, zome call signing, etc.)
- ✅ **Real-time signals**: Subscribe to Holochain signals and push to ERPLibre via webhooks or SSE
- ✅ **Official library**: Maintained by Holochain core team with ongoing support
- ✅ **Flexible**: Can customize bridge logic (caching, batching, request aggregation)
- ✅ **Production-ready**: Built-in error handling, retry logic, and connection management
- ✅ **Proper signing**: Full control over zome call signing and capability token management

**Trade-offs:**
- ⚠️ **Extra runtime**: Requires Node.js alongside Python
- ⚠️ **Custom code**: Need to write and maintain the bridge service
- ⚠️ **Polyglot stack**: Python + Node.js + Holochain

### 6.3 Alternative Approaches (Not Recommended)

**HTTP Gateway (`hc-http-gw`):**
- ❌ Limited to GET requests with Base64-encoded payloads
- ❌ No native signal support
- ❌ Requires workarounds for RESTful patterns
- ❌ Performance constraints (single call per request)

**Direct Python WebSocket Client:**
- ❌ Must implement entire Conductor API protocol
- ❌ Complex Ed25519 signing in Python
- ❌ High maintenance burden (no official client)
- ❌ Must track Holochain protocol changes

## 7. Node.js Bridge Implementation

### 7.1 Core Bridge Service

```javascript
// bridge-service.js
import { AppWebsocket, AdminWebsocket } from '@holochain/client';
import express from 'express';
import { createClient } from 'redis';
import Bull from 'bull';

class NondominiumBridge {
  constructor(config) {
    this.appWs = null;
    this.adminWs = null;
    this.redis = createClient({ url: config.redisUrl });
    this.queue = new Bull('nondominium', config.redisUrl);
    this.config = config;
  }

  async connect() {
    // Connect to Holochain Admin API
    this.adminWs = await AdminWebsocket.connect({
      url: new URL(this.config.adminWsUrl),
      wsClientOptions: { origin: this.config.appId }
    });

    // Connect to App WebSocket
    const token = await this.adminWs.issueAppAuthenticationToken({
      installed_app_id: this.config.appId
    });

    this.appWs = await AppWebsocket.connect({
      url: new URL(this.config.appWsUrl),
      token: token.token,
      wsClientOptions: { origin: this.config.appId }
    });

    // Subscribe to signals
    this.appWs.on('signal', this.handleSignal.bind(this));

    await this.redis.connect();
    console.log('Bridge connected to Holochain and Redis');
  }

  async handleSignal(signal) {
    console.log('Received signal:', signal);
    // Push signal to ERPLibre via webhook
    await this.notifyERPLibre(signal);
  }

  async notifyERPLibre(signal) {
    // POST to ERPLibre webhook endpoint
    const response = await fetch(this.config.erpWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: signal.data.type,
        payload: signal.data.payload
      })
    });
    console.log('Notified ERPLibre:', response.status);
  }

  async callZome(cellId, zomeName, fnName, payload) {
    const cacheKey = `zome:${zomeName}:${fnName}:${JSON.stringify(payload)}`;
    
    // Check cache for read operations
    if (fnName.startsWith('get_')) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    try {
      const result = await this.appWs.callZome({
        cell_id: cellId,
        zome_name: zomeName,
        fn_name: fnName,
        payload: payload
      }, 30000);

      // Cache read operations
      if (fnName.startsWith('get_')) {
        await this.redis.setEx(cacheKey, 300, JSON.stringify(result));
      }

      return result;
    } catch (error) {
      console.error('Zome call failed:', error);
      throw error;
    }
  }

  async createResource(cellId, specHash, quantity, unit, custodian) {
    return this.callZome(cellId, 'zome_resource', 'create_economic_resource', {
      conforms_to: specHash,
      quantity: quantity,
      unit: unit,
      custodian: custodian
    });
  }

  async searchResources(cellId, query = null) {
    return this.callZome(cellId, 'zome_resource', 'get_all_resources', {
      query: query
    });
  }

  async initiateUseProcess(cellId, resourceHash, receiver, startTime, endTime) {
    return this.callZome(cellId, 'zome_resource', 'initiate_use_process', {
      resource_hash: resourceHash,
      receiver: receiver,
      start_time: startTime,
      end_time: endTime
    });
  }

  async getReputationSummary(cellId, agentId) {
    return this.callZome(cellId, 'zome_gouvernance', 'get_reputation_summary', {
      agent: agentId
    });
  }
}

// Initialize bridge
const bridge = new NondominiumBridge({
  adminWsUrl: process.env.HC_ADMIN_WS_URL || 'ws://localhost:8000',
  appWsUrl: process.env.HC_APP_WS_URL || 'ws://localhost:8888',
  appId: process.env.HC_APP_ID || 'nondominium',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  erpWebhookUrl: process.env.ERP_WEBHOOK_URL || 'http://localhost:8069/nondominium/webhook'
});

await bridge.connect();
```

### 7.2 REST API Endpoints

```javascript
// api-routes.js
const app = express();
app.use(express.json());

// Helper to extract cell_id from request
function getCellId(req) {
  return [req.body.dna_hash || req.query.dna_hash, req.body.agent_key || req.query.agent_key];
}

// Resource Management
app.post('/api/resources', async (req, res) => {
  try {
    const cellId = getCellId(req);
    const result = await bridge.createResource(
      cellId,
      req.body.spec_hash,
      req.body.quantity,
      req.body.unit,
      req.body.custodian
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/resources', async (req, res) => {
  try {
    const cellId = getCellId(req);
    const resources = await bridge.searchResources(cellId, req.query.q);
    res.json({ success: true, data: resources });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/resources/:hash/use', async (req, res) => {
  try {
    const cellId = getCellId(req);
    const result = await bridge.initiateUseProcess(
      cellId,
      req.params.hash,
      req.body.receiver,
      req.body.start_time,
      req.body.end_time
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reputation
app.get('/api/reputation/:agent_id', async (req, res) => {
  try {
    const cellId = getCellId(req);
    const summary = await bridge.getReputationSummary(cellId, req.params.agent_id);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch operations
app.post('/api/batch', async (req, res) => {
  try {
    const cellId = getCellId(req);
    const results = await Promise.all(
      req.body.operations.map(op => 
        bridge.callZome(cellId, op.zome, op.function, op.payload)
      )
    );
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    holochain: bridge.appWs ? 'connected' : 'disconnected',
    redis: bridge.redis.isOpen ? 'connected' : 'disconnected'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bridge service running on port ${PORT}`);
});
```

## 8. ERPLibre Integration

### 8.1 Reading ERPLibre Inventory (Python)

```python
import xmlrpc.client
import requests
import os

class ERPLibreNondominiumSync:
    def __init__(self, erp_url, erp_db, erp_user, erp_password, bridge_url):
        self.erp_url = erp_url
        self.erp_db = erp_db
        self.erp_user = erp_user
        self.erp_password = erp_password
        self.bridge_url = bridge_url
        
        # Authenticate with ERPLibre
        common = xmlrpc.client.ServerProxy(f'{erp_url}/xmlrpc/2/common')
        self.uid = common.authenticate(erp_db, erp_user, erp_password, {})
        self.models = xmlrpc.client.ServerProxy(f'{erp_url}/xmlrpc/2/object')
    
    def get_available_products(self):
        """Fetch products with available quantity from ERPLibre"""
        products = self.models.execute_kw(
            self.erp_db, self.uid, self.erp_password,
            'product.product', 'search_read',
            [[('qty_available', '>', 0)]],
            {'fields': ['name', 'default_code', 'qty_available', 'uom_id', 'categ_id']}
        )
        return products
    
    def publish_to_nondominium(self, product, dna_hash, agent_key):
        """Publish a single product to Nondominium via Node.js bridge"""
        # Create ResourceSpecification
        spec_payload = {
            'dna_hash': dna_hash,
            'agent_key': agent_key,
            'name': product['name'],
            'description': f"SKU: {product['default_code']}",
            'category': product['categ_id'][1] if product['categ_id'] else 'General',
            'governance_rules': []
        }
        
        spec_response = requests.post(
            f"{self.bridge_url}/api/resource-specifications",
            json=spec_payload
        )
        spec_response.raise_for_status()
        spec_hash = spec_response.json()['data']
        
        # Create EconomicResource
        resource_payload = {
            'dna_hash': dna_hash,
            'agent_key': agent_key,
            'spec_hash': spec_hash,
            'quantity': product['qty_available'],
            'unit': product['uom_id'][1],
            'custodian': agent_key
        }
        
        resource_response = requests.post(
            f"{self.bridge_url}/api/resources",
            json=resource_payload
        )
        resource_response.raise_for_status()
        
        # Store Nondominium hash in ERPLibre product
        resource_hash = resource_response.json()['data']
        self.models.execute_kw(
            self.erp_db, self.uid, self.erp_password,
            'product.product', 'write',
            [[product['id']], {'x_nondominium_hash': resource_hash}]
        )
        
        return resource_hash
    
    def sync_all_products(self, dna_hash, agent_key):
        """Sync all available products to Nondominium"""
        products = self.get_available_products()
        results = []
        
        for product in products:
            try:
                resource_hash = self.publish_to_nondominium(product, dna_hash, agent_key)
                results.append({
                    'product_id': product['id'],
                    'product_name': product['name'],
                    'resource_hash': resource_hash,
                    'status': 'success'
                })
                print(f"✓ Published: {product['name']}")
            except Exception as e:
                results.append({
                    'product_id': product['id'],
                    'product_name': product['name'],
                    'error': str(e),
                    'status': 'failed'
                })
                print(f"✗ Failed: {product['name']} - {e}")
        
        return results

# Usage
sync = ERPLibreNondominiumSync(
    erp_url='http://localhost:8069',
    erp_db='erplibre_db',
    erp_user='admin',
    erp_password='admin',
    bridge_url='http://localhost:3000'
)

results = sync.sync_all_products(
    dna_hash=os.getenv('NONDOMINIUM_DNA_HASH'),
    agent_key=os.getenv('ORGANIZATION_AGENT_KEY')
)
```

### 8.2 ERPLibre Webhook Handler (Python)

```python
# odoo_addon/nondominium_bridge/controllers/webhook.py
from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class NondominiumWebhook(http.Controller):
    
    @http.route('/nondominium/webhook', type='json', auth='none', methods=['POST'], csrf=False)
    def handle_signal(self, **kwargs):
        """Handle real-time signals from Nondominium via Node.js bridge"""
        data = request.jsonrequest
        signal_type = data.get('type')
        payload = data.get('payload')
        
        _logger.info(f"Received Nondominium signal: {signal_type}")
        
        if signal_type == 'resource.use.initiated':
            self._handle_resource_use(payload)
        elif signal_type == 'resource.transferred':
            self._handle_resource_transfer(payload)
        elif signal_type == 'ppr.issued':
            self._handle_ppr_update(payload)
        
        return {'status': 'ok'}
    
    def _handle_resource_use(self, payload):
        """Update ERPLibre when a resource is used"""
        resource_hash = payload.get('resource_hash')
        receiver = payload.get('receiver')
        
        # Find product by Nondominium hash
        Product = request.env['product.product'].sudo()
        product = Product.search([('x_nondominium_hash', '=', resource_hash)], limit=1)
        
        if product:
            # Create a stock move for "External Use"
            StockMove = request.env['stock.move'].sudo()
            StockMove.create({
                'name': f'Nondominium Use: {receiver}',
                'product_id': product.id,
                'product_uom_qty': 1,
                'product_uom': product.uom_id.id,
                'location_id': product.property_stock_production.id,
                'location_dest_id': request.env.ref('stock.stock_location_customers').id,
                'state': 'done'
            })
            _logger.info(f"Created stock move for product {product.name}")
    
    def _handle_resource_transfer(self, payload):
        """Update custody when resource is transferred"""
        # Update internal tracking
        pass
    
    def _handle_ppr_update(self, payload):
        """Update organization reputation score"""
        # Update reputation field in res.partner or custom model
        pass
```

## 9. Deployment Architecture

### 9.1 Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  erplibre:
    image: erplibre/erplibre:latest
    ports:
      - "8069:8069"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=erplibre
    depends_on:
      - postgres

  holochain:
    image: holochain/holochain:latest
    ports:
      - "8000:8000"  # Admin WebSocket
      - "8888:8888"  # App WebSocket
    volumes:
      - ./nondominium.happ:/happ/nondominium.happ
      - holochain_data:/data
    command: holochain -c /data/conductor-config.yml

  bridge:
    build: ./bridge-service
    ports:
      - "3000:3000"
    environment:
      - HC_ADMIN_WS_URL=ws://holochain:8000
      - HC_APP_WS_URL=ws://holochain:8888
      - HC_APP_ID=nondominium
      - REDIS_URL=redis://redis:6379
      - ERP_WEBHOOK_URL=http://erplibre:8069/nondominium/webhook
    depends_on:
      - holochain
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=erplibre
      - POSTGRES_USER=odoo
      - POSTGRES_PASSWORD=odoo
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  holochain_data:
  postgres_data:
```

### 9.2 Bridge Service Dockerfile

```dockerfile
# bridge-service/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- ✅ Set up development environment (Docker Compose)
- ✅ Deploy ERPLibre, Holochain, and Nondominium hApp
- ✅ Implement core Node.js Bridge Service with `@holochain/client`
- ✅ Create basic REST API endpoints
- ✅ Test WebSocket connectivity and signal handling

### Phase 2: ERP Integration (Week 3-4)
- ✅ Implement Python sync script for ERPLibre inventory
- ✅ Create ERPLibre webhook handler for real-time updates
- ✅ Implement bidirectional data mapping
- ✅ Add error handling and retry logic
- ✅ Test with 2 organizations and cross-organizational discovery

### Phase 3: Advanced Features (Week 5-6)
- ✅ Implement batch operations for bulk sync
- ✅ Add caching layer (Redis) for performance
- ✅ Implement queue system for async operations
- ✅ Add proper zome call signing with delegation support
- ✅ Create PPR reputation dashboard integration

### Phase 4: Production Readiness (Week 7-8)
- ✅ Add comprehensive logging and monitoring
- ✅ Implement health checks and alerting
- ✅ Security audit and penetration testing
- ✅ Load testing and performance optimization
- ✅ Documentation and deployment guides

## 11. Next Steps

1. **Organizational Delegation**: Implement the delegation pattern where ERPLibre users act as delegates of the organization
2. **UI Integration**: Build native ERPLibre module for resource discovery and management
3. **Governance Rules**: Allow organizations to configure access rules via ERPLibre UI
4. **Financial Integration**: Connect resource usage to invoicing and accounting modules
5. **Multi-warehouse Support**: Handle complex inventory scenarios across locations
6. **Mobile App**: QR code scanning for custody transfers

## 12. References

- [ERPLibre GitHub](https://github.com/ERPLibre/ERPLibre)
- [Holochain Client JS](https://github.com/holochain/holochain-client-js)
- [Holochain Client JS API Docs](https://docs.holochain.org/)
- [Odoo API Documentation](https://www.odoo.com/documentation/16.0/developer/reference/external_api.html)
- [ValueFlows Ontology](https://www.valueflows.org/)
- [Nondominium Requirements](../requirements/requirements.md)
- [Nondominium Specifications](../specifications/specifications.md)

## 13. Future Architecture: Pure P2P vs. Organizational Variants

As Nondominium evolves, we envision two distinct deployment contexts: a **Pure P2P** context for individuals and an **Organizational** context (often bridged from ERPs). While the core ValueFlows logic remains consistent, the governance and identity layers diverge significantly.

The following analysis highlights key differences that may necessitate a fork or a modular architecture to support both use cases.

### 13.1 Identity & Delegation (The Agency Gap)

*   **Pure P2P Context**:
    *   **Structure**: 1 Human = 1 Agent Key.
    *   **Agency**: Direct. The individual is the sole signer and decision-maker.
    *   **Implication**: Simplifies the security model. Private keys live on the user's personal device.

*   **Organizational Context**:
    *   **Structure**: 1 Organization = 1 Identity (or a group of Agents).
    *   **Agency**: Delegated. The "Agent" on the DHT represents a legal entity (e.g., "Acme Corp"), but the actual signing is done by employees (e.g., Alice, Bob).
    *   **Requirement**: We need a **Delegation Pattern**.
        *   **Representative Keys**: Employees need their own keys that are authorized to sign *on behalf of* the Organization's root identity.
        *   **Scope & Expiry**: Alice might only be authorized to "Transport" resources, not "Sell" them. Bob might only be authorized to "Use" resources up to a certain value.
        *   **Revocation**: If Alice leaves the company, her delegation must be revoked immediately without changing the Organization's identity.

### 13.2 Reputation (PPR) Aggregation

*   **Pure P2P Context**:
    *   **Accrual**: Reputation (PPRs) sticks directly to the individual.
    *   **Portability**: High. The user carries their reputation everywhere.

*   **Organizational Context**:
    *   **Accrual**: External reputation accrues to the **Organization**. If Alice (the driver) delivers late, "Acme Corp" gets the negative PPR for timeliness.
    *   **Internal Attribution**: The ERP needs to track *which* employee caused the outcome. Nondominium might need to include a "performed_by" field in the metadata that links to an internal employee ID (hashed/private) so the organization can audit performance without exposing internal staff structures to the public DHT.
    *   **Inheritance**: A new employee starts with the Organization's reputation (trust by association), whereas a new P2P user starts from zero.

### 13.3 Governance: Autonomy vs. Policy

*   **Pure P2P Context**:
    *   **Decision Making**: Ad-hoc and autonomous. "I like your profile, I'll lend you my camera."
    *   **Rules**: Often negotiated socially or via simple template rules.

*   **Organizational Context**:
    *   **Decision Making**: Policy-driven and automated.
    *   **Automated Governance**: The ERP bridge might automatically approve requests based on strict criteria (e.g., "Borrower Credit Score > 700" AND "Inventory > 5 units").
    *   **Multi-Sig/Thresholds**: High-value transactions (e.g., transferring a vehicle) might require signatures from 2+ delegates (e.g., Warehouse Manager + Logistics Coordinator).

### 13.4 Custody vs. Ownership

*   **Pure P2P Context**:
    *   **Convergence**: Custody and Ownership are often the same person.
    *   **Transfers**: Usually implies a temporary transfer of possession (lending) or permanent transfer of ownership (giving/selling).

*   **Organizational Context**:
    *   **Divergence**: The Organization *owns* the resource, but an employee *holds* custody.
    *   **Internal Transfers**: When a drill moves from the "Warehouse" to "Service Truck 4", Nondominium might not need to know (it's internal to the agent). However, if Nondominium tracks *Location*, these internal shifts might need to be published without triggering a "Change of Ownership" event.
    *   **Legal Wrapper**: Interactions often imply a legal contract. The bridge might need to hash a PDF contract generated by the ERP and attach it to the `Commitment` or `EconomicEvent`.

### 13.5 Device Management & Security

*   **Pure P2P Context**:
    *   **Device**: Personal, single-user devices.
    *   **Security**: Biometrics or simple passwords.

*   **Organizational Context**:
    *   **Device**: Shared terminals (e.g., a warehouse tablet used by 10 people) or BYOD (Bring Your Own Device).
    *   **Session Management**: A shared device needs to support rapid "login/logout" of different delegates using the same Holochain Conductor, or manage multiple Agent keys securely.
    *   **IAM Integration**: Corporate users expect Single Sign-On (SSO). The bridge might need to map an OAuth token (from the ERP) to a Holochain Capability Token.

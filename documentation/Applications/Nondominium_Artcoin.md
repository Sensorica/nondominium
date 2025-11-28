# Nondominium Support for Artcoin

## 1. Summary of Artcoin in the Context of Nondominium

Artcoin (also referred to as the Internet of Art or IoA) is a proposed platform designed to disintermediate the art market and enable the scalable circulation of artworks. It builds upon the "Soogart" and "L'Artoteque" models, where artworks are displayed in public and private venues (restaurants, offices, cafes) rather than traditional galleries, allowing the public to discover, enjoy, rent, or adopt art in their daily environments.

In the context of **Nondominium**, Artcoin represents a specific **Resource Domain**. The core philosophy of Artcoin—making art accessible, creating a sharing economy for creative works, and ensuring fair compensation for creators—aligns perfectly with Nondominium's goals of creating organization-agnostic, uncapturable, and self-governed resources.

By leveraging Nondominium's infrastructure, Artcoin can transition from a centralized or low-tech agency model to a fully distributed, peer-to-peer ecosystem where:
- **Artworks** are treated as **Nondominium Resources**, governed by embedded rules rather than a central authority.
- **Artists** retain ownership and control over their work while enabling permissionless access for display and transport.
- **Venues** (Custodians) act as **Primary Accountable Agents**, managing the physical custody of the art.
- **Reputation** for all parties (artists, venues, transporters) is tracked via **Private Participation Receipts (PPRs)**, ensuring trust without a middleman.

## 2. Supporting Artcoin with Nondominium

Nondominium provides the necessary primitives to model the entire lifecycle of an artwork within the Artcoin ecosystem, from creation to display, and finally to adoption or return.

### Core Agents and Roles

The Artcoin ecosystem maps directly to Nondominium's Agent types:

*   **Artists (Accountable Agents):**
    *   Create **ResourceSpecifications** for their art (defining the "Artcoin" resource type).
    *   Create **Economic Resources** (the physical artworks).
    *   Define governance rules (e.g., "70% of sale price goes to artist," "Rent is $30/month," "Must be displayed in smoke-free environment").

*   **Venue Owners (Primary Accountable Agents / Custodians):**
    *   Restaurant or cafe owners who act as **Custodians**.
    *   They accept **Commitments** to store and display the art.
    *   They are responsible for the well-being of the resource while in their custody.

*   **Transporters (Accountable Agents with Transport Role):**
    *   Agents validated to move art between the Artist's studio and the Venue, or between Venues.
    *   Requires a validated **Transport Role** (likely requiring proof of insurance or vehicle suitability).

*   **Public / Art Lovers (Simple or Accountable Agents):**
    *   Discover art in Venues.
    *   Can "adopt" (buy) or rent art.
    *   Initiate **Use Processes** (viewing/renting) or **Transfer Processes** (adopting).

### Core Processes and Transactions

Nondominium's **Economic Processes** can model the circulation of art:

#### 1. Onboarding and Creation
*   **Artist** creates a `ResourceSpecification` for a collection (e.g., "Oil on Canvas 2025").
*   **Artist** creates an `EconomicResource` for a specific painting. The resource starts in the Artist's custody.

#### 2. Distribution (Artist to Venue)
*   **Venue Owner** signals interest in displaying the art.
*   **Transport Process:**
    *   A **Transporter** commits to move the painting from Artist to Venue.
    *   **Custody Transfer:** The Artist transfers custody to the Transporter (generating a `CustodyTransfer` PPR).
    *   The Transporter delivers to the Venue.
    *   **Custody Acceptance:** The Venue Owner accepts custody (generating a `CustodyAcceptance` PPR).
    *   The painting is now "In Storage/Display" at the Venue.

#### 3. Display and Renting (The "Soogart" Model)
*   **Use Process (Display):** The Venue "uses" the art to enhance their space.
    *   Governance rules might stipulate a rental fee paid to the Artist.
    *   This is modeled as a continuous `Use` process or periodic `AccessForUse` events.
*   **Discovery:** A Patron (Simple Agent) visits the restaurant and scans a QR code (linked to the Nondominium entry) to view the painting's history, artist profile, and price.

#### 4. Adoption (Transaction)
*   **Scenario:** A Patron decides to buy ("adopt") the painting.
*   **Commitment:** The Patron makes a `Commitment` to transfer value (if integrated with a payment system) or simply commits to the "Adoption" rules.
*   **Validation:** The Venue Owner (Custodian) validates the transaction.
*   **Transfer:**
    *   The Venue Owner initiates a **Transfer Process**.
    *   Custody is transferred from Venue to Patron.
    *   Ownership rights (if applicable in the governance rules) are updated.
    *   **Revenue Sharing:** If the system handles value flows (Phase 3), the payment is split according to the embedded `GovernanceRule` (e.g., 70% Artist, 20% Venue, 10% Protocol/DAO).

### Governance and Trust

*   **Reputation:** If a Venue damages a painting, their **Reliability Score** drops (via PPRs). Artists can filter Venues based on this score.
*   **Validation:** High-value art might require **Multi-Reviewer Validation** (REQ-GOV-06) before a custody transfer is finalized.
*   **Hard to Clone:** The digital twin (Nondominium entry) proves the authenticity of the physical piece, solving provenance issues.

By using Nondominium, Artcoin becomes a **self-governed, capture-resistant ecosystem** where the value flows directly between the creators and the custodians/appreciators, fulfilling the vision of a "true sharing economy" for art.


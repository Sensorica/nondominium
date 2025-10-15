# Tech Stack

## Backend Architecture

### Holochain Framework

- **Platform**: Holochain 0.5.3+ (distributed application framework)
- **Language**: Rust (HDK/HDI 0.5.x-0.6.x)
- **Compilation Target**: WebAssembly (WASM)
- **Pattern**: Agent-centric with peer-to-peer DHT architecture
- **Security**: Capability-based access control with progressive token advancement

### Zome Architecture (3-Zome System)

- **zome_person**: Agent identity, profiles, roles, private data sharing, capability progression
- **zome_resource**: Resource specifications, Economic Resources, Economic Processes, lifecycle management
- **zome_gouvernance**: Commitments, claims, validation, PPR issuance, cross-zome coordination

### Data Model & Standards

- **Economic Standard**: ValueFlows (Resource-Event-Agent pattern)
- **Reputation System**: Private Participation Receipts (PPRs) with cryptographic signatures
- **Privacy Model**: Four-layer architecture (Public, Private, Access-Controlled, Derived)
- **Validation**: Multi-reviewer schemes (2-of-3, N-of-M, simple_majority)

## Frontend Architecture

### Framework & Language

- **Framework**: Svelte 5.0 + SvelteKit 2.22.0 (full-stack framework)
- **Language**: TypeScript 5.0.0 (type safety throughout)
- **Build Tool**: Vite 7.0.4 (fast development and optimized builds)
- **Package Manager**: Bun (high-performance JavaScript runtime)

### UI & Styling

- **CSS Framework**: TailwindCSS 4.1.12 (utility-first design system)
- **UI Components**: Custom component library with TailwindCSS integration
- **Typography**: @tailwindcss/typography 0.5.15 (content styling)
- **Forms**: @tailwindcss/forms 0.5.9 (form component styling)

### State Management & Data Flow

- **Client Library**: @holochain/client 0.19.0 (Holochain DHT interaction)
- **Type Safety**: End-to-end TypeScript integration from Rust entries to UI
- **Real-time Updates**: Holochain signal architecture for live UI reactivity
- **Error Handling**: Comprehensive error management across all layers

## Development & Testing

### Testing Framework

- **Backend Testing**: Vitest 3.1.3 + @holochain/tryorama 0.18.2 (Holochain integration testing)
- **Frontend Testing**: Vitest 3.2.3 with @vitest/browser 3.2.3 (browser testing)
- **E2E Testing**: Playwright 1.53.0 (cross-browser end-to-end testing)
- **Test Architecture**: 4-layer strategy (Foundation, Integration, Scenarios, Performance)

### Code Quality & Tooling

- **Linting**: ESLint 9.18.0 with TypeScript support
- **Formatting**: Prettier 3.4.2 with Svelte and TailwindCSS plugins
- **Type Checking**: Svelte-check 4.0.0 (compile-time type validation)
- **Development**: Hot module replacement with Vite dev server
- **Documentation Access**: Use the Octocode and Context7 MCPs for easy access to documentation and code examples.

## Build & Deployment

### Build Pipeline

- **Backend**: Rust cargo build targeting wasm32-unknown-unknown
- **Frontend**: Vite production builds with optimization
- **Packaging**: Holochain .happ bundle generation
- **Distribution**: .webhapp packages for Holochain Launcher

### Environment Management

- **Development**: Nix shells for reproducible environments
- **Network Simulation**: Multi-agent development networks with configurable agent counts
- **Testing**: Isolated test environments with Tryorama framework
- **Production**: Holochain Launcher distribution with automatic updates

## Security & Privacy

### Authentication & Authorization

- **Agent Identity**: Cryptographic key pairs managed by Holochain conductors
- **Capability Tokens**: Progressive access control (general → restricted → full)
- **Role-Based Access**: Validated agent roles for specialized Economic Processes
- **Cross-Zome Security**: Multi-zome authorization validation

### Privacy Architecture

- **Private Entries**: Holochain-enforced private data storage (PII, PPRs)
- **Selective Disclosure**: User-controlled data sharing with expiration controls
- **Cryptographic Signatures**: Bilateral authentication for participation receipts
- **Reputation Privacy**: Private PPRs with selective reputation sharing

## Monitoring & Observability

### Development Monitoring

- **Holochain Playground**: Development introspection and debugging tools
- **DHT Inspection**: Real-time network state and entry visualization
- **Signal Monitoring**: Live updates for cross-zome coordination
- **Performance Profiling**: WASM performance optimization and bottleneck identification

### Quality Assurance

- **Test Coverage**: Comprehensive testing across all three zomes and frontend
- **Integration Testing**: Cross-zome workflow validation with multi-agent scenarios
- **Error Tracking**: Detailed error logging and debugging information
- **Performance Monitoring**: Resource usage and network efficiency metrics

## Integration Standards

### ValueFlows Compliance

- **Economic Actions**: Complete VfAction enum implementation with nondominium extensions
- **Resource Management**: ValueFlows-compliant EconomicResource lifecycle
- **Process Integration**: Economic Process workflows with ValueFlows event tracking
- **Ontology Support**: Knowledge, Plan, and Observation layer implementation

### Interoperability

- **Cross-Network**: Federation protocols for multiple nondominium networks
- **API Standards**: RESTful patterns for external integrations
- **Data Export**: Standardized formats for external analysis and reporting
- **Identity Federation**: Support for external identity verification systems

## Development Standards

### Code Architecture

- **Modular Design**: Clean separation of concerns across all zomes
- **Type Safety**: Comprehensive TypeScript integration and Rust type systems
- **Error Handling**: Domain-specific error enums with detailed context
- **Documentation**: Inline documentation with comprehensive API references

### Collaboration Tools

- **Version Control**: Git with structured commit patterns
- **Code Review**: Pull request workflows with quality gates
- **Issue Tracking**: Structured issue management with priority labeling
- **Documentation**: Comprehensive README files and technical specifications

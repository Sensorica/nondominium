# Performance Optimization Patterns for Nondominium

This document covers performance optimization techniques specific to Holochain zome development in the nondominium project.

## WASM Size Optimization

### 1. Dependency Management

#### Minimal Dependencies
```toml
# Cargo.toml - Use workspace dependencies and avoid unnecessary crates
[dependencies]
hdk = { workspace = true }
hdi = { workspace = true }
serde = { workspace = true }
thiserror = { workspace = true }

# Only add what you absolutely need
# Avoid: heavy crates like chrono, regex, etc. unless necessary
```

#### Feature Flags
```toml
# Disable unused features
[dependencies.serde]
version = "1.0"
default-features = false
features = ["derive"]  # Only enable what you need
```

### 2. Memory Allocation

#### Use wee_alloc
```rust
// In lib.rs
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
```

```toml
# Cargo.toml
[dependencies.wee_alloc]
version = "0.4"
optional = true

[profile.release]
panic = "abort"  # Removes panic handling code
opt-level = "s"  # Optimize for size
lto = true       # Link-time optimization
codegen-units = 1
```

### 3. Efficient Data Structures

#### Prefer Compact Types
```rust
// Good: Compact and efficient
pub struct CompactEntry {
    pub id: u32,              // Instead of String
    pub flags: u8,            // Bit flags instead of bools
    pub timestamp: u64,       // Unix timestamp instead of Timestamp
    pub agent_hash: AgentPubKey, // Keep references, not clones
}

// Avoid: Large structs with many optional fields
pub struct BloatedEntry {
    pub name: String,              // Could be &str or CompactString
    pub description: Option<String>, // Could be empty string
    pub is_active: bool,           // Could be bit flag
    pub is_verified: bool,         // Could be bit flag
    pub created_at: Timestamp,     // Could be u64
    pub metadata: HashMap<String, String>, // Heavy
}
```

#### Bit Flags for Booleans
```rust
#[derive(Debug, Clone, Copy)]
pub struct EntryFlags(u8);

impl EntryFlags {
    pub const IS_ACTIVE: u8 = 0b0001;
    pub const IS_VERIFIED: u8 = 0b0010;
    pub const IS_PRIVATE: u8 = 0b0100;
    pub const IS_ARCHIVED: u8 = 0b1000;

    pub fn new() -> Self { EntryFlags(0) }
    pub fn is_active(&self) -> bool { self.0 & Self::IS_ACTIVE != 0 }
    pub fn set_active(&mut self) { self.0 |= Self::IS_ACTIVE; }
    pub fn clear_active(&mut self) { self.0 &= !Self::IS_ACTIVE; }
}

pub struct EfficientEntry {
    pub flags: EntryFlags,
    pub data: String,
    // ... other fields
}
```

## Query Optimization

### 1. Efficient Link Queries

#### Targeted Link Queries
```rust
// Good: Specific query with tag filter
pub fn get_active_resources_for_agent(agent: AgentPubKey) -> ExternResult<Vec<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(agent, LinkTypes::AgentToResource)?
            .link_tag(LinkTag::new("active"))  // Filter by tag
            .build(),
    )?;

    let records = links.iter()
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(records)
}

// Avoid: Broad queries that return too much data
pub fn get_all_resources() -> ExternResult<Vec<Record>> {
    // This could return thousands of records
    let path = Path::from("all_resources");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::ResourceAnchor)?.build(),
    )?;
    // ... process potentially huge result set
}
```

#### Pagination for Large Results
```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedQuery {
    pub page: u32,
    pub page_size: u32,
    pub filter_tags: Option<Vec<String>>,
}

#[hdk_extern]
pub fn get_resources_paginated(query: PaginatedQuery) -> ExternResult<PaginatedResult<Record>> {
    let path = Path::from("resources");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::ResourceAnchor)?.build(),
    )?;

    // Filter first, then paginate
    let filtered_links = if let Some(ref tags) = query.filter_tags {
        links.iter()
            .filter(|link| {
                tags.iter().any(|tag| {
                    String::from_utf8_lossy(&link.tag.0).contains(tag)
                })
            })
            .collect()
    } else {
        links.iter().collect()
    };

    let total_count = filtered_links.len() as u32;
    let start = (query.page * query.page_size) as usize;
    let end = start + (query.page_size as usize);

    let paginated_links = filtered_links.iter()
        .skip(start)
        .take(end - start);

    let items = paginated_links
        .map(|link| get(link.target.clone(), GetOptions::default()))
        .filter_map(Result::ok)
        .flatten()
        .collect();

    Ok(PaginatedResult {
        items,
        total_count,
        page: query.page,
        page_size: query.page_size,
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total_count: u32,
    pub page: u32,
    pub page_size: u32,
}
```

### 2. Efficient Data Retrieval

#### Batch Operations
```rust
// Good: Batch get operations
pub fn get_multiple_entries(entry_hashes: Vec<ActionHash>) -> ExternResult<Vec<Record>> {
    get_details(entry_hashes, GetOptions::default())?
        .into_iter()
        .filter_map(|detail| detail.record().cloned())
        .collect::<Vec<_>>()
        .into()
}

// Avoid: Multiple individual get calls
pub fn get_multiple_entries_slow(entry_hashes: Vec<ActionHash>) -> ExternResult<Vec<Record>> {
    let mut records = Vec::new();
    for hash in entry_hashes {
        if let Some(record) = get(hash, GetOptions::default())? {
            records.push(record);
        }
    }
    Ok(records)
}
```

#### Lazy Loading
```rust
#[derive(Serialize, Deserialize, Debug)]
pub struct ResourceSummary {
    pub hash: ActionHash,
    pub name: String,
    pub status: String,
    // Don't include full entry data
}

#[hdk_extern]
pub fn list_resources() -> ExternResult<Vec<ResourceSummary>> {
    let path = Path::from("resources");
    let links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::ResourceAnchor)?.build(),
    )?;

    let summaries = links.iter()
        .filter_map(|link| {
            // Only extract minimal data needed for listing
            let tag = String::from_utf8_lossy(&link.tag.0);
            let parts: Vec<&str> = tag.split('|').collect();
            if parts.len() >= 2 {
                Some(ResourceSummary {
                    hash: link.target.clone(),
                    name: parts[0].to_string(),
                    status: parts[1].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    Ok(summaries)
}

#[hdk_extern]
pub fn get_resource_full(hash: ActionHash) -> ExternResult<Option<Record>> {
    // Full details only when requested
    get(hash, GetOptions::default())
}
```

## Serialization Optimization

### 1. Efficient Serde Usage

#### Custom Serialization
```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OptimizedEntry {
    #[serde(with = "serde_bytes")]
    pub data: Vec<u8>,  // More efficient than String for binary data

    #[serde(skip_serializing_if = "Option::is_none")]
    pub optional_field: Option<String>,

    #[serde(default)]
    pub flags: u8,  // Default value prevents unnecessary serialization
}
```

#### Compact String Handling
```rust
use smartstring::{SmartString, LazyCompact};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StringOptimizedEntry {
    #[serde(with = "smartstring_serde")]
    pub short_text: SmartString<LazyCompact>,  // Inline for short strings, heap for long

    #[serde(with = "compact_string")]
    pub identifier: CompactString,
}

// Custom serialization for CompactString
mod compact_string {
    use serde::{Deserialize, Deserializer, Serializer};
    use compact_str::CompactString;

    pub fn serialize<S>(s: &CompactString, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(s.as_str())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<CompactString, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Ok(CompactString::new(s))
    }
}
```

## Cross-Zome Performance

### 1. Efficient Cross-Zome Calls

#### Batch Cross-Zome Operations
```rust
// Good: Batch multiple operations into single call
#[derive(Serialize, Deserialize, Debug)]
pub struct BatchValidationInput {
    pub entries: Vec<(ActionHash, EntryType)>,
    pub agent: AgentPubKey,
}

#[hdk_extern]
pub fn batch_validate_entries(input: BatchValidationInput) -> ExternResult<Vec<ValidationResult>> {
    let mut results = Vec::new();

    for (hash, entry) in input.entries {
        let result = validate_single_entry(&entry, &input.agent)?;
        results.push(ValidationResult { hash, valid: result });
    }

    Ok(results)
}

// Avoid: Multiple individual cross-zome calls
pub fn validate_entries_slow(entries: Vec<(ActionHash, EntryType)>) -> ExternResult<Vec<bool>> {
    let mut results = Vec::new();
    for (hash, entry) in entries {
        let result = call_remote_zome(&entry)?;  // Network call per entry
        results.push(result);
    }
    Ok(results)
}
```

#### Cached Cross-Zome Data
```rust
// Cache frequently accessed cross-zome data in links
pub fn cache_agent_capabilities(agent: AgentPubKey, capabilities: Vec<String>) -> ExternResult<()> {
    let cache_key = format!("capabilities:{}", agent);
    let path = Path::from(cache_key);

    // Store capabilities as link tags for efficient retrieval
    for capability in capabilities {
        create_link(
            path.path_entry_hash()?,
            agent.clone(),
            LinkTypes::CapabilityCache,
            LinkTag::new(capability),
        )?;
    }

    // Set expiration link
    let expires_at = sys_time()? + Duration::from_secs(3600); // 1 hour
    create_link(
        path.path_entry_hash()?,
        agent,
        LinkTypes::CacheExpiration,
        LinkTag::new(expires_at.as_secs().to_string()),
    )?;

    Ok(())
}

pub fn get_cached_capabilities(agent: AgentPubKey) -> ExternResult<Option<Vec<String>>> {
    let cache_key = format!("capabilities:{}", agent);
    let path = Path::from(cache_key);

    // Check expiration first
    let expiration_links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::CacheExpiration)?.build(),
    )?;

    if let Some(expiration_link) = expiration_links.first() {
        let expires_at_str = String::from_utf8_lossy(&expiration_link.tag.0);
        if let Ok(expires_at) = expires_at_str.parse::<u64>() {
            let current_time = sys_time()?.as_secs();
            if current_time > expires_at {
                // Cache expired
                return Ok(None);
            }
        }
    }

    // Get cached capabilities
    let capability_links = get_links(
        GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::CapabilityCache)?.build(),
    )?;

    let capabilities = capability_links.iter()
        .map(|link| String::from_utf8_lossy(&link.tag.0).to_string())
        .collect();

    Ok(Some(capabilities))
}
```

## Memory Management

### 1. Reduce Memory Allocations

#### String Interning for Common Values
```rust
use std::collections::HashMap;
use once_cell::sync::Lazy;

static COMMON_STRINGS: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut m = HashMap::new();
    m.insert("active", "active");
    m.insert("inactive", "inactive");
    m.insert("pending", "pending");
    m.insert("completed", "completed");
    m
});

pub fn intern_string(s: &str) -> &str {
    COMMON_STRINGS.get(s).copied().unwrap_or(s)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MemoryEfficientEntry {
    pub status: &'static str,  // Use static strings for common values
    pub data: String,          // Only use owned strings for variable data
}
```

#### Avoid Unnecessary Clones
```rust
// Good: Use references
pub fn process_entry(entry: &EntryType) -> ExternResult<ProcessedData> {
    // Work with reference, no cloning
    let result = calculate_something(&entry.field_name)?;
    Ok(ProcessedData { result })
}

// Avoid: Unnecessary cloning
pub fn process_entry_slow(entry: EntryType) -> ExternResult<ProcessedData> {
    // Entry cloned unnecessarily
    let result = calculate_something(&entry.field_name)?;
    Ok(ProcessedData { result })
}
```

## Build-Time Optimizations

### 1. Compiler Optimizations

#### Profile Settings
```toml
# Cargo.toml
[profile.release]
opt-level = "s"          # Optimize for size
lto = true               # Link-time optimization
codegen-units = 1        # Better optimization
panic = "abort"          # Removes panic handling code
overflow-checks = false  # Remove overflow checks in release

[profile.dev]
opt-level = 0            # No optimization in dev for faster compilation
debug = true
```

#### Conditional Compilation
```rust
#[cfg(feature = "debug-logs")]
macro_rules! debug_log {
    ($($arg:tt)*) => {
        holochain_zome_types::debug_log!($($arg)*);
    };
}

#[cfg(not(feature = "debug-logs"))]
macro_rules! debug_log {
    ($($arg:tt)*) => {};
}

// Use in code
debug_log!("This is a debug message: {}", some_value);
```

### 2. Build Scripts Optimization

#### Parallel Builds
```bash
# Build with multiple jobs
RUSTFLAGS="-C target-cpu=native" cargo build --release -j $(nproc)

# Use mold linker if available (faster linking)
RUSTFLAGS="-C link-arg=-fuse-ld=mold" cargo build --release
```

## Monitoring and Profiling

### 1. Performance Metrics

#### WASM Size Tracking
```bash
# Track WASM size over time
#!/bin/bash
echo "=== WASM Size Report ===" > size_report.txt
echo "Date: $(date)" >> size_report.txt

for wasm in target/wasm32-unknown-unknown/release/*.wasm; do
    size=$(wc -c < "$wasm")
    echo "$wasm: $size bytes" >> size_report.txt
done

echo "Total size: $(du -sh target/wasm32-unknown-unknown/release/ | cut -f1)" >> size_report.txt
```

#### Build Time Tracking
```bash
# Track build times
time cargo build --release --target wasm32-unknown-unknown 2>&1 | tee build_time.log
```

### 2. Runtime Performance

#### Performance Counters
```rust
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct PerformanceMetrics {
    pub query_count: u32,
    pub total_query_time_ms: u64,
    pub cache_hits: u32,
    pub cache_misses: u32,
}

thread_local! {
    static PERF_METRICS: RefCell<PerformanceMetrics> = RefCell::new(PerformanceMetrics::default());
}

pub fn record_query_time(duration_ms: u64) {
    PERF_METRICS.with(|metrics| {
        let mut m = metrics.borrow_mut();
        m.query_count += 1;
        m.total_query_time_ms += duration_ms;
    });
}

#[hdk_extern]
pub fn get_performance_metrics(_: ()) -> ExternResult<PerformanceMetrics> {
    PERF_METRICS.with(|metrics| Ok(metrics.borrow().clone()))
}
```

## Best Practices Summary

### DO ✅
- Use targeted link queries with tag filters
- Implement pagination for large result sets
- Use compact data structures (u8 flags, bit fields)
- Batch operations when possible
- Cache frequently accessed cross-zome data
- Use references instead of clones
- Optimize WASM size with profile settings

### DON'T ❌
- Load entire datasets into memory
- Make multiple individual network calls
- Use heavy dependencies unnecessarily
- Clone large data structures
- Ignore pagination for large queries
- Skip build optimizations
- Forget to monitor WASM size and performance

### Performance Checklist
- [ ] Dependencies minimal and necessary
- [ ] Data structures optimized for size
- [ ] Link queries targeted and filtered
- [ ] Pagination implemented for large results
- [ ] Cross-zome calls batched
- [ ] Build settings optimized
- [ ] Performance metrics implemented
- [ ] WASM size under target limits (ideally < 500KB per zome)
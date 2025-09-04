use hdk::prelude::*;

/// Create an agent-specific anchor path
pub fn agent_anchor(agent_pubkey: &AgentPubKey, suffix: &str) -> Path {
  Path::from(format!("agent_{}_{}", agent_pubkey, suffix))
}

/// Create a typed anchor path
pub fn typed_path(path_type: &str, identifier: &str) -> Path {
  Path::from(format!("{}_{}", path_type, identifier))
}

/// Generate a path for global discovery anchors
pub fn global_anchor(entity_type: &str) -> Path {
  Path::from(format!("all_{entity_type}"))
}

/// Generate a path for agent-specific anchors
pub fn agent_anchor_by_relation(agent_pub_key: &AgentPubKey, relation: &str) -> Path {
  Path::from(format!("{relation}_{agent_pub_key}"))
}

/// Generate a path for category-based anchors
pub fn category_anchor(entity_type: &str, category: &str) -> Path {
  Path::from(format!("{entity_type}_by_category_{category}"))
}

/// Generate a path for tag-based anchors
pub fn tag_anchor(entity_type: &str, tag: &str) -> Path {
  Path::from(format!("{entity_type}_by_tag_{tag}"))
}

/// Generate a path for state-based anchors
pub fn state_anchor(entity_type: &str, state: &str) -> Path {
  Path::from(format!("{entity_type}_by_state_{state}"))
}
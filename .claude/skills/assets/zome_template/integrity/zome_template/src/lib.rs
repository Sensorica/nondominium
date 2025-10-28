use hdi::prelude::*;

// Entry Types
// TODO: Add your entry types here

// Link Types
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum LinkTypes {
    // Discovery anchors
    TemplateAnchor,

    // Agent relationships
    AgentToTemplate,
    TemplateToAgent,

    // Business relationships
    TemplateToRelated,
    RelatedToTemplate,
}

// Entry Validation
// TODO: Add your entry validation functions here

// Example validation function
pub fn validate_create_template(
    _action: EntryCreationAction,
    _template: TemplateEntry,
) -> ExternResult<ValidateCallbackResult> {
    // TODO: Implement validation logic
    Ok(ValidateCallbackResult::Valid)
}

// Example entry validation
#[hdk_extern]
pub fn validate_create_entry(validate_data: ValidateCreateEntryData) -> ExternResult<ValidateCallbackResult> {
    match validate_data.app_entry {
        EntryTypes::Template(template) => validate_create_template(validate_data.action, template),
        // TODO: Add validation for other entry types
    }
}

#[hdk_extern]
pub fn validate_update_entry(validate_data: ValidateUpdateEntryData) -> ExternResult<ValidateCallbackResult> {
    // TODO: Implement update validation
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate_delete_entry(validate_data: ValidateDeleteEntryData) -> ExternResult<ValidateCallbackResult> {
    // TODO: Implement delete validation
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate_create_link(validate_data: ValidateCreateLinkData) -> ExternResult<ValidateCallbackResult> {
    // TODO: Implement link creation validation
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate_delete_link(validate_data: ValidateDeleteLinkData) -> ExternResult<ValidateCallbackResult> {
    // TODO: Implement link deletion validation
    Ok(ValidateCallbackResult::Valid)
}

// TODO: Add any extern functions that other zomes need to call
// Example:
// #[hdk_extern]
// pub fn get_template_details(entry_hash: ActionHash) -> ExternResult<Option<TemplateEntry>> {
//     let record = match get(entry_hash, GetOptions::default())? {
//         Some(record) => record,
//         None => return Ok(None),
//     };
//
//     let entry = record.entry().to_app_entry()?;
//     let template: TemplateEntry = entry.try_into()?;
//     Ok(Some(template))
// }
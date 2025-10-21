//! Scenario Test Template
//! Reference example for complete user journey testing following nondominium patterns

import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  // Person zome functions
  createPerson,
  assignPersonRole,
  getPersonRoles,
  hasRoleCapability,

  // Resource zome functions
  createResource,
  getResource,
  updateResource,
  transferResource,

  // Governance zome functions
  createCommitment,
  createClaim,
  validatePPRRequest,
  createGrant,

  // Common utilities
  samplePerson,
  sampleResource,
  sampleRole,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./common";

import { runScenarioWithThreeAgents } from "../utils";

test("complete resource sharing workflow with PPR", async () => {
  await runScenarioWithThreeAgents(
    async (
      _scenario: Scenario,
      owner: PlayerApp,
      admin: PlayerApp,
      requester: PlayerApp,
    ) => {
      // === SETUP PHASE ===

      // Step 1: Create persons with appropriate roles
      console.log("📝 Setting up persons with roles...");

      await createPerson(owner, { name: "Resource Owner", avatar_url: "" });
      await createPerson(admin, { name: "System Admin", avatar_url: "" });
      await createPerson(requester, {
        name: "Resource Requester",
        avatar_url: "",
      });

      await assignPersonRole(owner, owner.agentPubKey, "admin");
      await assignPersonRole(admin, admin.agentPubKey, "admin");
      await assignPersonRole(owner, requester.agentPubKey, "user");

      await dhtSync([owner, admin, requester]);

      // Verify roles are assigned correctly
      const ownerRoles = await getPersonRoles(owner, owner.agentPubKey);
      const requesterRoles = await getPersonRoles(
        requester,
        requester.agentPubKey,
      );

      assert.ok(ownerRoles.includes("admin"));
      assert.ok(requesterRoles.includes("user"));

      // === RESOURCE CREATION PHASE ===

      // Step 2: Owner creates a resource with PPR-enabled governance
      console.log("🏗️ Creating resource with PPR-enabled governance...");

      const resourceInput = {
        name: "Collaborative Project Document",
        description:
          "A comprehensive project document requiring controlled access",
        classification: "document",
        governance_rules: {
          can_transfer: true,
          requires_approval: true,
          allowed_roles: ["admin", "user"],
          ppr_enabled: true,
          expiration_hours: 72,
          auto_approve: false,
        },
      };

      const resourceHash = await createResource(owner, resourceInput);
      assert.ok(resourceHash);

      await dhtSync([owner, admin, requester]);

      // Verify resource exists and has correct governance
      const resource = await getResource(owner, resourceHash);
      assert.ok(resource);
      assert.equal(resource.name, resourceInput.name);
      assert.equal(resource.governance_rules.ppr_enabled, true);

      // === ACCESS REQUEST PHASE ===

      // Step 3: Requester requests access to the resource via PPR
      console.log("🔐 Requesting access via PPR system...");

      const pprRequest = {
        resource_hash: resourceHash,
        purpose: "Need to review and contribute to the project documentation",
        requested_capabilities: ["read", "comment", "suggest_edits"],
        expiration_hours: 48,
        justification:
          "Part of the core project team working on this documentation",
      };

      // Validate PPR request
      const validationResult = await validatePPRRequest(owner, pprRequest);
      assert.ok(validationResult);

      // Create PPR request as a claim
      const claimInput = {
        resource_hash: resourceHash,
        claim_type: "PPR_REQUEST",
        agent_pub_key: requester.agentPubKey,
        claim_data: JSON.stringify(pprRequest),
        evidence: "Project team member requiring access",
      };

      const claimHash = await createClaim(requester, claimInput);
      assert.ok(claimHash);

      await dhtSync([owner, admin, requester]);

      // === APPROVAL PHASE ===

      // Step 4: Admin reviews and approves the PPR request
      console.log("✅ Admin reviewing PPR request...");

      // Admin validates the PPR request
      const adminValidation = await validatePPRRequest(admin, pprRequest);
      assert.ok(adminValidation);

      // Admin creates approval commitment
      const approvalCommitment = {
        resource_hash: resourceHash,
        commitment_type: "PPR_APPROVAL",
        agent_pub_key: requester.agentPubKey,
        terms: JSON.stringify({
          approved_capabilities: pprRequest.requested_capabilities,
          expiration_hours: pprRequest.expiration_hours,
          approved_by: admin.agentPubKey,
          approved_at: Date.now(),
        }),
      };

      const commitmentHash = await createCommitment(admin, approvalCommitment);
      assert.ok(commitmentHash);

      await dhtSync([owner, admin, requester]);

      // === GRANT CREATION PHASE ===

      // Step 5: Owner creates capability grant for requester
      console.log("🔑 Creating capability grant...");

      const grantInput = {
        resource_hash: resourceHash,
        grantee_pub_key: requester.agentPubKey,
        capabilities: pprRequest.requested_capabilities,
        expires_at: Date.now() + pprRequest.expiration_hours * 60 * 60 * 1000,
        purpose: pprRequest.purpose,
        conditions: {
          must_log_access: true,
          max_downloads: 10,
          can_share: false,
        },
      };

      const grantHash = await createGrant(owner, grantInput);
      assert.ok(grantHash);

      await dhtSync([owner, admin, requester]);

      // === ACCESS VERIFICATION PHASE ===

      // Step 6: Verify requester can access the resource
      console.log("🔍 Verifying access control...");

      // Requester should now be able to access the resource
      const requesterResource = await getResource(requester, resourceHash);
      assert.ok(requesterResource);
      assert.equal(requesterResource.name, resource.name);

      // Verify the requester has the correct capabilities
      const requesterCapabilities = await hasRoleCapability(
        requester,
        requester.agentPubKey,
        "resource_access",
      );
      assert.ok(requesterCapabilities);

      // === AUDIT AND LOGGING PHASE ===

      // Step 7: Create audit trail for the entire workflow
      console.log("📊 Creating audit trail...");

      const auditCommitment = {
        resource_hash: resourceHash,
        commitment_type: "PPR_WORKFLOW_COMPLETE",
        agent_pub_key: admin.agentPubKey,
        terms: JSON.stringify({
          workflow_steps: [
            "person_creation",
            "role_assignment",
            "resource_creation",
            "ppr_request",
            "admin_validation",
            "approval_commitment",
            "grant_creation",
            "access_verification",
          ],
          participants: [
            owner.agentPubKey,
            admin.agentPubKey,
            requester.agentPubKey,
          ],
          completed_at: Date.now(),
          total_duration_ms: Date.now(), // This would be calculated properly
        }),
      };

      const auditHash = await createCommitment(admin, auditCommitment);
      assert.ok(auditHash);

      await dhtSync([owner, admin, requester]);

      // === FINAL VERIFICATION ===

      // Step 8: Final verification of the complete workflow
      console.log("✨ Final workflow verification...");

      // Verify all participants can see the appropriate information
      const ownerResource = await getResource(owner, resourceHash);
      const adminResource = await getResource(admin, resourceHash);

      assert.equal(ownerResource.name, requesterResource.name);
      assert.equal(adminResource.name, requesterResource.name);

      // Verify the workflow is properly recorded
      const finalCommitments = await admin.callZome({
        zome_name: "gouvernance",
        fn_name: "get_commitments_for_resource",
        payload: resourceHash,
      });

      assert.ok(finalCommitments.length >= 3); // Should have at least 3 commitments

      console.log("🎉 Complete PPR workflow test passed successfully!");
    },
  );
});

test("multi-agent resource approval scenario", async () => {
  await runScenarioWithThreeAgents(
    async (
      _scenario: Scenario,
      creator: PlayerApp,
      approver: PlayerApp,
      user: PlayerApp,
    ) => {
      // === SETUP ===
      console.log("🚀 Setting up multi-agent approval scenario...");

      await createPerson(creator, { name: "Content Creator", avatar_url: "" });
      await createPerson(approver, {
        name: "Content Approver",
        avatar_url: "",
      });
      await createPerson(user, { name: "End User", avatar_url: "" });

      await assignPersonRole(creator, creator.agentPubKey, "content_creator");
      await assignPersonRole(
        approver,
        approver.agentPubKey,
        "content_approver",
      );
      await assignPersonRole(creator, user.agentPubKey, "end_user");

      await dhtSync([creator, approver, user]);

      // === CONTENT CREATION ===
      console.log("📝 Creating content requiring approval...");

      const contentResource = {
        name: "Technical Documentation",
        description: "Comprehensive technical documentation for public release",
        classification: "documentation",
        governance_rules: {
          can_transfer: true,
          requires_approval: true,
          allowed_roles: ["content_approver", "content_creator"],
          approval_workflow: ["content_approver"],
          auto_publish: false,
          review_required: true,
        },
      };

      const contentHash = await createResource(creator, contentResource);
      assert.ok(contentHash);

      await dhtSync([creator, approver, user]);

      // === APPROVAL WORKFLOW ===
      console.log("🔍 Starting approval workflow...");

      // Approver reviews the content
      const content = await getResource(approver, contentHash);
      assert.ok(content);

      // Approver creates review commitment
      const reviewCommitment = {
        resource_hash: contentHash,
        commitment_type: "CONTENT_REVIEW",
        agent_pub_key: approver.agentPubKey,
        terms: JSON.stringify({
          review_status: "approved",
          review_comments:
            "Content meets quality standards and is ready for publication",
          reviewed_at: Date.now(),
          reviewer: approver.agentPubKey,
        }),
      };

      const reviewHash = await createCommitment(approver, reviewCommitment);
      assert.ok(reviewHash);

      await dhtSync([creator, approver, user]);

      // === PUBLICATION ===
      console.log("📢 Publishing approved content...");

      // Update resource to mark as published
      const publishedResource = {
        ...content,
        governance_rules: {
          ...content.governance_rules,
          is_published: true,
          published_at: Date.now(),
          published_by: approver.agentPubKey,
        },
      };

      const updateResult = await creator.callZome({
        zome_name: "resource",
        fn_name: "update_resource",
        payload: {
          original_hash: contentHash,
          updated_resource: publishedResource,
        },
      });

      assert.ok(updateResult);

      await dhtSync([creator, approver, user]);

      // === ACCESS VERIFICATION ===
      console.log("👥 Verifying public access...");

      // End user should now be able to access the published content
      const publicContent = await getResource(user, contentHash);
      assert.ok(publicContent);
      assert.equal(publicContent.name, contentResource.name);

      // Verify publication metadata
      const publishedContent = await getResource(creator, contentHash);
      assert.equal(publishedContent.governance_rules.is_published, true);

      console.log("✅ Multi-agent approval scenario completed successfully!");
    },
  );
});

test("resource lifecycle management scenario", async () => {
  await runScenarioWithThreeAgents(
    async (
      _scenario: Scenario,
      owner: PlayerApp,
      manager: PlayerApp,
      consumer: PlayerApp,
    ) => {
      // === RESOURCE LIFECYCLE: CREATE → MANAGE → CONSUME → ARCHIVE ===
      console.log("🔄 Starting resource lifecycle scenario...");

      // Setup participants
      await createPerson(owner, { name: "Resource Owner", avatar_url: "" });
      await createPerson(manager, { name: "Resource Manager", avatar_url: "" });
      await createPerson(consumer, {
        name: "Resource Consumer",
        avatar_url: "",
      });

      await assignPersonRole(owner, owner.agentPubKey, "resource_owner");
      await assignPersonRole(manager, manager.agentPubKey, "resource_manager");
      await assignPersonRole(owner, consumer.agentPubKey, "resource_consumer");

      await dhtSync([owner, manager, consumer]);

      // === 1. CREATE PHASE ===
      console.log("1️⃣ Creating new resource...");

      const resourceInput = {
        name: "Digital Asset Package",
        description: "Complete digital asset package with various media files",
        classification: "digital_asset",
        governance_rules: {
          can_transfer: true,
          requires_approval: false,
          allowed_roles: [
            "resource_owner",
            "resource_manager",
            "resource_consumer",
          ],
          lifecycle_stage: "active",
          version: "1.0.0",
          max_downloads: 100,
          license_type: "creative_commons",
        },
      };

      const resourceHash = await createResource(owner, resourceInput);
      assert.ok(resourceHash);

      await dhtSync([owner, manager, consumer]);

      // === 2. MANAGE PHASE ===
      console.log("2️⃣ Managing resource...");

      // Manager updates resource with additional metadata
      const managedResource = await getResource(manager, resourceHash);
      const updatedResource = {
        ...managedResource,
        governance_rules: {
          ...managedResource.governance_rules,
          managed_by: manager.agentPubKey,
          last_managed: Date.now(),
          access_log_enabled: true,
        },
      };

      const updateResult = await manager.callZome({
        zome_name: "resource",
        fn_name: "update_resource",
        payload: {
          original_hash: resourceHash,
          updated_resource: updatedResource,
        },
      });

      assert.ok(updateResult);

      await dhtSync([owner, manager, consumer]);

      // === 3. CONSUME PHASE ===
      console.log("3️⃣ Resource consumption...");

      // Consumer accesses and uses the resource
      const consumerResource = await getResource(consumer, resourceHash);
      assert.ok(consumerResource);

      // Create usage commitment
      const usageCommitment = {
        resource_hash: resourceHash,
        commitment_type: "RESOURCE_USAGE",
        agent_pub_key: consumer.agentPubKey,
        terms: JSON.stringify({
          usage_type: "download",
          used_at: Date.now(),
          user_agent: consumer.agentPubKey,
          version: consumerResource.governance_rules.version,
        }),
      };

      const usageHash = await createCommitment(consumer, usageCommitment);
      assert.ok(usageHash);

      await dhtSync([owner, manager, consumer]);

      // === 4. ARCHIVE PHASE ===
      console.log("4️⃣ Archiving resource...");

      // Owner decides to archive the resource
      const archiveCommitment = {
        resource_hash: resourceHash,
        commitment_type: "RESOURCE_ARCHIVE",
        agent_pub_key: owner.agentPubKey,
        terms: JSON.stringify({
          archive_reason: "Resource lifecycle complete",
          archived_at: Date.now(),
          archived_by: owner.agentPubKey,
          final_version: "1.0.0",
          total_usage_count: 1,
        }),
      };

      const archiveHash = await createCommitment(owner, archiveCommitment);
      assert.ok(archiveHash);

      await dhtSync([owner, manager, consumer]);

      // === LIFECYCLE VERIFICATION ===
      console.log("✅ Verifying complete lifecycle...");

      // Verify all commitments exist
      const allCommitments = await owner.callZome({
        zome_name: "gouvernance",
        fn_name: "get_commitments_for_resource",
        payload: resourceHash,
      });

      assert.ok(allCommitments.length >= 3); // Should have usage, management, and archive commitments

      // Verify final state
      const finalResource = await getResource(owner, resourceHash);
      assert.ok(finalResource);

      console.log("🎉 Resource lifecycle scenario completed successfully!");
    },
  );
});

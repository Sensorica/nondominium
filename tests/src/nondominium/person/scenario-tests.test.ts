import { assert, expect, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";
import { Record as HolochainRecord } from "@holochain/client";

import {
  samplePerson,
  samplePrivateData,
  sampleRole,
  createPerson,
  storePrivateData,
  getMyProfile,
  getAgentProfile,
  getAllAgents,
  assignRole,
  getAgentRoles,
  hasRoleCapability,
  getAgentCapabilityLevel,
  setupBasicPersons,
  setupPersonsWithPrivateData,
  TEST_ROLES,
  CAPABILITY_LEVELS,
  PersonTestContext,
} from "./common.js";
import { runScenarioWithTwoAgents, delay } from "../utils.js";

test(
  "Complete user onboarding workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: New community member joins and gets onboarded

        // Step 1: Lynn (existing member) creates her profile
        console.log("Step 1: Lynn creates her profile");
        const alicePersonResult = await createPerson(
          alice.cells[0],
          samplePerson({
            name: "Lynn Cooper",
            avatar_url: "https://example.com/alice-avatar.png",
          })
        );

        await storePrivateData(
          alice.cells[0],
          samplePrivateData({
            legal_name: "Lynn Elizabeth Cooper",
            email: "alice.cooper@example.com",
            address: "123 Harmony Lane, Community Springs, CS 12345",
            phone: "+1-555-ALICE-1",
            emergency_contact: "Bob Cooper (spouse), +1-555-BOB-EMG",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Step 2: Lynn gets founder role (self-assigned or system-assigned)
        console.log("Step 2: Lynn becomes community founder");
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.FOUNDER,
              description: "Community founder and initial administrator",
            },
            alice.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify Lynn's founder status
        const aliceCapability = await getAgentCapabilityLevel(
          alice.cells[0],
          alice.agentPubKey
        );
        assert.equal(aliceCapability, CAPABILITY_LEVELS.PRIMARY);

        // Step 3: Bob joins as a new member
        console.log("Step 3: Bob joins as new member");
        const bobPersonResult = await createPerson(
          bob.cells[0],
          samplePerson({
            name: "Bob Williams",
            avatar_url: "https://example.com/bob-avatar.png",
          })
        );

        await storePrivateData(
          bob.cells[0],
          samplePrivateData({
            legal_name: "Robert James Williams",
            email: "bob.williams@example.com",
            address: "456 Innovation Drive, Tech Valley, TV 67890",
            phone: "+1-555-BOB-123",
            emergency_contact: "Sarah Williams (sister), +1-555-SARAH-99",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Step 4: Community discovery - members can see each other
        console.log("Step 4: Community discovery");
        const allMembers = await getAllAgents(alice.cells[0]);
        assert.equal(allMembers.agents.length, 2);

        const memberNames = allMembers.agents.map((agent) => agent.name).sort();
        assert.deepEqual(memberNames, ["Lynn Cooper", "Bob Williams"]);

        // Lynn can see Bob's public profile
        const bobPublicProfile = await getAgentProfile(
          alice.cells[0],
          bob.agentPubKey
        );
        assert.ok(bobPublicProfile.person);
        assert.equal(bobPublicProfile.person!.name, "Bob Williams");
        assert.isUndefined(bobPublicProfile.private_data); // Privacy maintained

        // Step 5: Lynn assigns steward role to Bob
        console.log("Step 5: Role assignment and capability delegation");
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.STEWARD,
              description:
                "Community steward responsible for member onboarding and support",
            },
            bob.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Step 6: Verify role-based capabilities
        console.log("Step 6: Capability verification");
        const bobHasStewardRole = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.STEWARD
        );
        assert.isTrue(bobHasStewardRole);

        const bobCapabilityLevel = await getAgentCapabilityLevel(
          alice.cells[0],
          bob.agentPubKey
        );
        assert.equal(bobCapabilityLevel, CAPABILITY_LEVELS.ACCOUNTABLE);

        // Step 7: Bob can now assign roles to new members (as steward)
        console.log("Step 7: Bob exercises steward capabilities");
        const bobRoles = await getAgentRoles(bob.cells[0], bob.agentPubKey);
        assert.equal(bobRoles.roles.length, 1);
        assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.STEWARD);
        assert.equal(
          bobRoles.roles[0].assigned_by.toString(),
          alice.agentPubKey.toString()
        );

        // Final verification: Complete community state
        console.log("Final verification: Complete community state");

        // Lynn's complete profile
        const aliceCompleteProfile = await getMyProfile(alice.cells[0]);
        assert.ok(aliceCompleteProfile.person);
        assert.ok(aliceCompleteProfile.private_data);
        assert.equal(aliceCompleteProfile.person!.name, "Lynn Cooper");
        assert.equal(
          aliceCompleteProfile.private_data!.legal_name,
          "Lynn Elizabeth Cooper"
        );

        // Bob's complete profile
        const bobCompleteProfile = await getMyProfile(bob.cells[0]);
        assert.ok(bobCompleteProfile.person);
        assert.ok(bobCompleteProfile.private_data);
        assert.equal(bobCompleteProfile.person!.name, "Bob Williams");
        assert.equal(
          bobCompleteProfile.private_data!.legal_name,
          "Robert James Williams"
        );

        console.log("✅ Complete onboarding workflow successful");
      }
    );
  },
  { timeout: 300000 } // 5 minutes for complex scenario
);

test(
  "Community governance workflow with role hierarchy",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Establishing governance hierarchy and role-based access

        // Setup: Both members join community
        console.log("Setup: Community member setup");
        const context = await setupPersonsWithPrivateData(alice, bob);
        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 1: Establish primary leadership
        console.log("Phase 1: Establish primary leadership");
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.PRIMARY,
              description:
                "Primary accountable agent responsible for community governance",
            },
            alice.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 2: Delegate accountable roles
        console.log("Phase 2: Delegate accountable roles");
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.STEWARD,
              description: "Community steward for member support",
            },
            bob.agentPubKey
          )
        );

        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.COORDINATOR,
              description: "Resource coordinator for community assets",
            },
            bob.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 3: Verify governance hierarchy
        console.log("Phase 3: Verify governance hierarchy");

        // Lynn has primary capability
        const aliceCapability = await getAgentCapabilityLevel(
          alice.cells[0],
          alice.agentPubKey
        );
        assert.equal(aliceCapability, CAPABILITY_LEVELS.PRIMARY);

        // Bob has accountable capability (multiple accountable roles)
        const bobCapability = await getAgentCapabilityLevel(
          alice.cells[0],
          bob.agentPubKey
        );
        assert.equal(bobCapability, CAPABILITY_LEVELS.ACCOUNTABLE);

        // Phase 4: Role-specific capability validation
        console.log("Phase 4: Role-specific capability validation");

        // Bob has specific role capabilities
        const bobHasSteward = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.STEWARD
        );
        const bobHasCoordinator = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.COORDINATOR
        );
        const bobHasPrimary = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.PRIMARY
        );

        assert.isTrue(bobHasSteward);
        assert.isTrue(bobHasCoordinator);
        assert.isFalse(bobHasPrimary);

        // Lynn has primary capability
        const aliceHasPrimary = await hasRoleCapability(
          alice.cells[0],
          alice.agentPubKey,
          TEST_ROLES.PRIMARY
        );
        const aliceHasSteward = await hasRoleCapability(
          alice.cells[0],
          alice.agentPubKey,
          TEST_ROLES.STEWARD
        );

        assert.isTrue(aliceHasPrimary);
        assert.isFalse(aliceHasSteward);

        // Phase 5: Cross-agent validation of governance
        console.log("Phase 5: Cross-agent validation");

        // Both agents see consistent governance structure
        const aliceRolesFromBob = await getAgentRoles(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobRolesFromLynn = await getAgentRoles(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.equal(aliceRolesFromBob.roles.length, 1);
        assert.equal(aliceRolesFromBob.roles[0].role_name, TEST_ROLES.PRIMARY);

        assert.equal(bobRolesFromLynn.roles.length, 2);
        const bobRoleNames = bobRolesFromLynn.roles
          .map((role) => role.role_name)
          .sort();
        assert.deepEqual(bobRoleNames, [
          TEST_ROLES.COORDINATOR,
          TEST_ROLES.STEWARD,
        ]);

        console.log("✅ Governance workflow completed successfully");
      }
    );
  },
  { timeout: 300000 }
);

test(
  "Privacy and access control workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Comprehensive privacy boundary testing

        console.log("Setup: Creating community members with sensitive data");

        // Lynn joins with comprehensive profile
        await createPerson(
          alice.cells[0],
          samplePerson({
            name: "Dr. Lynn Smith",
            avatar_url: "https://medical-directory.com/dr-alice.jpg",
          })
        );

        await storePrivateData(
          alice.cells[0],
          samplePrivateData({
            legal_name: "Dr. Lynn Marie Smith, MD",
            email: "alice.smith@hospital.com",
            address: "789 Medical Plaza, Suite 201, Health City, HC 54321",
            phone: "+1-555-DOCTOR-1",
            photo_id_hash: "medical_license_12345_hash",
            emergency_contact:
              "Medical Association Emergency Line, +1-800-MED-HELP",
          })
        );

        // Bob joins with different profile type
        await createPerson(
          bob.cells[0],
          samplePerson({
            name: "Bob Community",
            avatar_url: "https://community.org/members/bob.png",
          })
        );

        await storePrivateData(
          bob.cells[0],
          samplePrivateData({
            legal_name: "Robert Community Builder",
            email: "bob@community.org",
            address: "123 Community Center Dr, Collaboration Town, CT 98765",
            phone: "+1-555-BUILDER",
            emergency_contact: "Community Emergency Response, +1-555-EMERGENCY",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Test 1: Public profile visibility
        console.log("Test 1: Public profile visibility");

        const alicePublicFromBob = await getAgentProfile(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobPublicFromLynn = await getAgentProfile(
          alice.cells[0],
          bob.agentPubKey
        );

        // Public data is visible
        assert.ok(alicePublicFromBob.person);
        assert.equal(alicePublicFromBob.person!.name, "Dr. Lynn Smith");
        assert.equal(
          alicePublicFromBob.person!.avatar_url,
          "https://medical-directory.com/dr-alice.jpg"
        );

        assert.ok(bobPublicFromLynn.person);
        assert.equal(bobPublicFromLynn.person!.name, "Bob Community");

        // Private data is not visible cross-agent
        assert.isUndefined(alicePublicFromBob.private_data);
        assert.isUndefined(bobPublicFromLynn.private_data);

        // Test 2: Self-access to private data
        console.log("Test 2: Self-access to private data");

        const alicePrivateProfile = await getMyProfile(alice.cells[0]);
        const bobPrivateProfile = await getMyProfile(bob.cells[0]);

        // Own private data is accessible
        assert.ok(alicePrivateProfile.private_data);
        assert.equal(
          alicePrivateProfile.private_data!.legal_name,
          "Dr. Lynn Marie Smith, MD"
        );
        assert.equal(
          alicePrivateProfile.private_data!.email,
          "alice.smith@hospital.com"
        );
        assert.equal(
          alicePrivateProfile.private_data!.photo_id_hash,
          "medical_license_12345_hash"
        );

        assert.ok(bobPrivateProfile.private_data);
        assert.equal(
          bobPrivateProfile.private_data!.legal_name,
          "Robert Community Builder"
        );
        assert.equal(
          bobPrivateProfile.private_data!.email,
          "bob@community.org"
        );

        // Test 3: Role assignments don't leak private data
        console.log("Test 3: Role assignments with privacy maintained");

        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.STEWARD,
              description: "Medical advisor for community health initiatives",
            },
            alice.agentPubKey
          )
        );

        await assignRole(
          bob.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.COORDINATOR,
              description: "Community resource coordination specialist",
            },
            bob.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Roles are visible, private data still protected
        const aliceRolesFromBob = await getAgentRoles(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobRolesFromLynn = await getAgentRoles(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.equal(aliceRolesFromBob.roles.length, 1);
        assert.equal(aliceRolesFromBob.roles[0].role_name, TEST_ROLES.STEWARD);

        assert.equal(bobRolesFromLynn.roles.length, 1);
        assert.equal(
          bobRolesFromLynn.roles[0].role_name,
          TEST_ROLES.COORDINATOR
        );

        // But cross-agent private data access still denied
        const alicePublicAfterRole = await getAgentProfile(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobPublicAfterRole = await getAgentProfile(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.isUndefined(alicePublicAfterRole.private_data);
        assert.isUndefined(bobPublicAfterRole.private_data);

        // Test 4: Capability checking works without private data exposure
        console.log("Test 4: Capability checking with privacy intact");

        const aliceHasSteward = await hasRoleCapability(
          bob.cells[0],
          alice.agentPubKey,
          TEST_ROLES.STEWARD
        );
        const bobHasCoordinator = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.COORDINATOR
        );

        assert.isTrue(aliceHasSteward);
        assert.isTrue(bobHasCoordinator);

        const aliceCapLevel = await getAgentCapabilityLevel(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobCapLevel = await getAgentCapabilityLevel(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.equal(aliceCapLevel, CAPABILITY_LEVELS.ACCOUNTABLE);
        assert.equal(bobCapLevel, CAPABILITY_LEVELS.ACCOUNTABLE);

        console.log(
          "✅ Privacy and access control workflow completed successfully"
        );
      }
    );
  },
  { timeout: 300000 }
);

test(
  "Community scaling and discovery workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Community growth, member discovery, and organizational patterns

        console.log("Phase 1: Initial community establishment");

        // Founder establishes community
        await createPerson(
          alice.cells[0],
          samplePerson({
            name: "Lynn Founder",
            avatar_url: "https://community.org/founder.png",
          })
        );

        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.FOUNDER,
              description: "Community founder and primary governance lead",
            },
            alice.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify initial state
        let allMembers = await getAllAgents(alice.cells[0]);
        assert.equal(allMembers.agents.length, 1);
        assert.equal(allMembers.agents[0].name, "Lynn Founder");

        console.log("Phase 2: First member joins");

        // Bob joins as first member
        await createPerson(
          bob.cells[0],
          samplePerson({
            name: "Bob FirstMember",
            avatar_url: "https://community.org/member1.png",
          })
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Community grows
        allMembers = await getAllAgents(alice.cells[0]);
        assert.equal(allMembers.agents.length, 2);

        const memberNames = allMembers.agents.map((agent) => agent.name).sort();
        assert.deepEqual(memberNames, ["Lynn Founder", "Bob FirstMember"]);

        console.log("Phase 3: Role delegation and capability distribution");

        // Founder delegates steward role to first member
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.STEWARD,
              description: "Community steward for new member onboarding",
            },
            bob.agentPubKey
          )
        );

        // Founder also assigns coordinator role
        await assignRole(
          alice.cells[0],
          sampleRole(
            {
              role_name: TEST_ROLES.COORDINATOR,
              description: "Resource coordinator for community assets",
            },
            bob.agentPubKey
          )
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        console.log("Phase 4: Verify distributed governance structure");

        // Check capability distribution
        const aliceCapability = await getAgentCapabilityLevel(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobCapability = await getAgentCapabilityLevel(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.equal(aliceCapability, CAPABILITY_LEVELS.PRIMARY);
        assert.equal(bobCapability, CAPABILITY_LEVELS.ACCOUNTABLE);

        // Verify role distribution
        const aliceRoles = await getAgentRoles(bob.cells[0], alice.agentPubKey);
        const bobRoles = await getAgentRoles(alice.cells[0], bob.agentPubKey);

        assert.equal(aliceRoles.roles.length, 1);
        assert.equal(aliceRoles.roles[0].role_name, TEST_ROLES.FOUNDER);

        assert.equal(bobRoles.roles.length, 2);
        const bobRoleNames = bobRoles.roles
          .map((role) => role.role_name)
          .sort();
        assert.deepEqual(bobRoleNames, [
          TEST_ROLES.COORDINATOR,
          TEST_ROLES.STEWARD,
        ]);

        console.log("Phase 5: Discovery and interaction patterns");

        // Both agents can discover full community
        const aliceViewOfCommunity = await getAllAgents(alice.cells[0]);
        const bobViewOfCommunity = await getAllAgents(bob.cells[0]);

        assert.equal(aliceViewOfCommunity.agents.length, 2);
        assert.equal(bobViewOfCommunity.agents.length, 2);

        // Cross-agent profile access works
        const aliceProfileFromBob = await getAgentProfile(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobProfileFromLynn = await getAgentProfile(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.ok(aliceProfileFromBob.person);
        assert.equal(aliceProfileFromBob.person!.name, "Lynn Founder");

        assert.ok(bobProfileFromLynn.person);
        assert.equal(bobProfileFromLynn.person!.name, "Bob FirstMember");

        console.log("Phase 6: Community readiness for further scaling");

        // Verify the community has proper governance structure for growth

        // Primary accountability established
        const hasFounder = await hasRoleCapability(
          bob.cells[0],
          alice.agentPubKey,
          TEST_ROLES.FOUNDER
        );
        assert.isTrue(hasFounder);

        // Distributed accountable roles
        const hasSteward = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.STEWARD
        );
        const hasCoordinator = await hasRoleCapability(
          alice.cells[0],
          bob.agentPubKey,
          TEST_ROLES.COORDINATOR
        );

        assert.isTrue(hasSteward);
        assert.isTrue(hasCoordinator);

        // Member discovery functioning
        assert.equal(allMembers.agents.length, 2);

        console.log(
          "✅ Community scaling workflow completed - ready for Phase 2 features"
        );
      }
    );
  },
  { timeout: 300000 }
);


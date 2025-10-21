import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  samplePerson,
  samplePrivateData,
  sampleRole,
  createPerson,
  storePrivateData,
  getMyProfile,
  getPersonProfile,
  getAllPersons,
  assignRole,
  getPersonRoles,
  hasRoleCapability,
  getCapabilityLevel,
  setupPersonsWithPrivateData,
  TEST_ROLES,
  CAPABILITY_LEVELS,
} from "./common";
import { runScenarioWithTwoAgents } from "../utils";

test("Complete user onboarding workflow", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Scenario: New community member joins and gets onboarded

      // Step 1: Lynn (existing member) creates her profile
      console.log("Step 1: Lynn creates her profile");
      const lynnPersonResult = await createPerson(
        lynn.cells[0],
        samplePerson({
          name: "Lynn Cooper",
          avatar_url: "https://example.com/lynn-avatar.png",
        }),
      );

      await storePrivateData(
        lynn.cells[0],
        samplePrivateData({
          legal_name: "Lynn Elizabeth Cooper",
          email: "lynn.foster@example.com",
          address: "123 Harmony Lane, Community Springs, CS 12345",
          phone: "+1-555-ALICE-1",
          emergency_contact: "Bob Cooper (spouse), +1-555-BOB-EMG",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Step 2: Lynn gets founder role (self-assigned or system-assigned)
      console.log("Step 2: Lynn becomes community founder");
      await assignRole(
        lynn.cells[0],
        sampleRole(lynn.agentPubKey, {
          role_name: TEST_ROLES.FOUNDER,
          description: "Community founder and initial administrator",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify Lynn's founder status
      const lynnCapability = await getCapabilityLevel(
        lynn.cells[0],
        lynn.agentPubKey,
      );
      assert.equal(lynnCapability, CAPABILITY_LEVELS.GOVERNANCE);

      // Step 3: Bob joins as a new member
      console.log("Step 3: Bob joins as new member");
      const bobPersonResult = await createPerson(
        bob.cells[0],
        samplePerson({
          name: "Bob Williams",
          avatar_url: "https://example.com/bob-avatar.png",
        }),
      );

      await storePrivateData(
        bob.cells[0],
        samplePrivateData({
          legal_name: "Robert James Williams",
          email: "bob.williams@example.com",
          address: "456 Innovation Drive, Tech Valley, TV 67890",
          phone: "+1-555-BOB-123",
          emergency_contact: "Sarah Williams (sister), +1-555-SARAH-99",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Step 4: Community discovery - members can see each other
      console.log("Step 4: Community discovery");
      const allMembers = await getAllPersons(lynn.cells[0]);
      assert.equal(allMembers.persons.length, 2);

      const memberNames = allMembers.persons
        .map((person) => person.name)
        .sort();
      assert.deepEqual(memberNames, ["Bob Williams", "Lynn Cooper"]);

      // Lynn can see Bob's public profile
      const bobPublicProfile = await getPersonProfile(
        lynn.cells[0],
        bob.agentPubKey,
      );
      assert.ok(bobPublicProfile.person);
      assert.equal(bobPublicProfile.person!.name, "Bob Williams");
      assert.isUndefined(bobPublicProfile.private_data); // Privacy maintained

      // Step 5: Lynn assigns steward role to Bob
      console.log("Step 5: Role assignment and capability delegation");
      await assignRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_STEWARD,
          description:
            "Community steward responsible for member onboarding and support",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Step 6: Verify role-based capabilities
      console.log("Step 6: Capability verification");
      const bobHasStewardRole = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      assert.isTrue(bobHasStewardRole);

      const bobCapabilityLevel = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );
      assert.equal(bobCapabilityLevel, CAPABILITY_LEVELS.STEWARDSHIP);

      // Step 7: Bob can now assign roles to new members (as steward)
      console.log("Step 7: Bob exercises steward capabilities");
      const bobRoles = await getPersonRoles(bob.cells[0], bob.agentPubKey);
      assert.equal(bobRoles.roles.length, 1);
      assert.equal(bobRoles.roles[0].role_name, TEST_ROLES.RESOURCE_STEWARD);
      assert.equal(
        bobRoles.roles[0].assigned_by.toString(),
        lynn.agentPubKey.toString(),
      );

      // Final verification: Complete community state
      console.log("Final verification: Complete community state");

      // Lynn's complete profile
      const lynnCompleteProfile = await getMyProfile(lynn.cells[0]);
      assert.ok(lynnCompleteProfile.person);
      assert.ok(lynnCompleteProfile.private_data);
      assert.equal(lynnCompleteProfile.person!.name, "Lynn Cooper");
      assert.equal(
        lynnCompleteProfile.private_data!.legal_name,
        "Lynn Elizabeth Cooper",
      );

      // Bob's complete profile
      const bobCompleteProfile = await getMyProfile(bob.cells[0]);
      assert.ok(bobCompleteProfile.person);
      assert.ok(bobCompleteProfile.private_data);
      assert.equal(bobCompleteProfile.person!.name, "Bob Williams");
      assert.equal(
        bobCompleteProfile.private_data!.legal_name,
        "Robert James Williams",
      );

      console.log("✅ Complete onboarding workflow successful");
    },
  );
}, 300000); // 5 minutes for complex scenario

test("Community governance workflow with role hierarchy", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Scenario: Establishing governance hierarchy and role-based access

      // Setup: Both members join community
      console.log("Setup: Community member setup");
      const context = await setupPersonsWithPrivateData(lynn, bob);
      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Phase 1: Establish primary leadership
      console.log("Phase 1: Establish primary leadership");
      await assignRole(
        lynn.cells[0],
        sampleRole(lynn.agentPubKey, {
          role_name: TEST_ROLES.FOUNDER,
          description:
            "Primary accountable agent responsible for community governance",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Phase 2: Delegate accountable roles
      console.log("Phase 2: Delegate accountable roles");
      await assignRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_STEWARD,
          description: "Community steward for member support",
        }),
      );

      await assignRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_COORDINATOR,
          description: "Resource coordinator for community assets",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Phase 3: Verify governance hierarchy
      console.log("Phase 3: Verify governance hierarchy");

      // Lynn has governance capability
      const lynnCapability = await getCapabilityLevel(
        lynn.cells[0],
        lynn.agentPubKey,
      );
      assert.equal(lynnCapability, CAPABILITY_LEVELS.GOVERNANCE);

      // Bob has coordination capability (multiple coordination roles)
      const bobCapability = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );
      assert.equal(bobCapability, CAPABILITY_LEVELS.COORDINATION);

      // Phase 4: Role-specific capability validation
      console.log("Phase 4: Role-specific capability validation");

      // Bob has specific role capabilities
      const bobHasSteward = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      const bobHasCoordinator = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );
      const bobHasFounder = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.FOUNDER,
      );

      assert.isTrue(bobHasSteward);
      assert.isTrue(bobHasCoordinator);
      assert.isFalse(bobHasFounder);

      // Lynn has founder capability
      const lynnHasFounder = await hasRoleCapability(
        lynn.cells[0],
        lynn.agentPubKey,
        TEST_ROLES.FOUNDER,
      );
      const lynnHasSteward = await hasRoleCapability(
        lynn.cells[0],
        lynn.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );

      assert.isTrue(lynnHasFounder);
      assert.isFalse(lynnHasSteward);

      // Phase 5: Cross-agent validation of governance
      console.log("Phase 5: Cross-agent validation");

      // Both agents see consistent governance structure
      const lynnRolesFromBob = await getPersonRoles(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobRolesFromLynn = await getPersonRoles(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.equal(lynnRolesFromBob.roles.length, 1);
      assert.equal(lynnRolesFromBob.roles[0].role_name, TEST_ROLES.FOUNDER);

      assert.equal(bobRolesFromLynn.roles.length, 2);
      const bobRoleNames = bobRolesFromLynn.roles
        .map((role) => role.role_name)
        .sort();
      assert.deepEqual(bobRoleNames, [
        TEST_ROLES.RESOURCE_COORDINATOR,
        TEST_ROLES.RESOURCE_STEWARD,
      ]);

      console.log("✅ Governance workflow completed successfully");
    },
  );
}, 300000);

test("Privacy and access control workflow", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Scenario: Comprehensive privacy boundary testing

      console.log("Setup: Creating community members with sensitive data");

      // Lynn joins with comprehensive profile
      await createPerson(
        lynn.cells[0],
        samplePerson({
          name: "Dr. Lynn Smith",
          avatar_url: "https://medical-directory.com/dr-lynn.jpg",
        }),
      );

      await storePrivateData(
        lynn.cells[0],
        samplePrivateData({
          legal_name: "Dr. Lynn Marie Smith, MD",
          email: "lynn.smith@hospital.com",
          address: "789 Medical Plaza, Suite 201, Health City, HC 54321",
          phone: "+1-555-DOCTOR-1",
          emergency_contact:
            "Medical Association Emergency Line, +1-800-MED-HELP",
        }),
      );

      // Bob joins with different profile type
      await createPerson(
        bob.cells[0],
        samplePerson({
          name: "Bob Community",
          avatar_url: "https://community.org/members/bob.png",
        }),
      );

      await storePrivateData(
        bob.cells[0],
        samplePrivateData({
          legal_name: "Robert Community Builder",
          email: "bob@community.org",
          address: "123 Community Center Dr, Collaboration Town, CT 98765",
          phone: "+1-555-BUILDER",
          emergency_contact: "Community Emergency Response, +1-555-EMERGENCY",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Test 1: Public profile visibility
      console.log("Test 1: Public profile visibility");

      const lynnPublicFromBob = await getPersonProfile(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobPublicFromLynn = await getPersonProfile(
        lynn.cells[0],
        bob.agentPubKey,
      );

      // Public data is visible
      assert.ok(lynnPublicFromBob.person);
      assert.equal(lynnPublicFromBob.person!.name, "Dr. Lynn Smith");
      assert.equal(
        lynnPublicFromBob.person!.avatar_url,
        "https://medical-directory.com/dr-lynn.jpg",
      );

      assert.ok(bobPublicFromLynn.person);
      assert.equal(bobPublicFromLynn.person!.name, "Bob Community");

      // Private data is not visible cross-agent
      assert.isUndefined(lynnPublicFromBob.private_data);
      assert.isUndefined(bobPublicFromLynn.private_data);

      // Test 2: Self-access to private data
      console.log("Test 2: Self-access to private data");

      const lynnPrivateProfile = await getMyProfile(lynn.cells[0]);
      const bobPrivateProfile = await getMyProfile(bob.cells[0]);

      // Own private data is accessible
      assert.ok(lynnPrivateProfile.private_data);
      assert.equal(
        lynnPrivateProfile.private_data!.legal_name,
        "Dr. Lynn Marie Smith, MD",
      );
      assert.equal(
        lynnPrivateProfile.private_data!.email,
        "lynn.smith@hospital.com",
      );

      assert.ok(bobPrivateProfile.private_data);
      assert.equal(
        bobPrivateProfile.private_data!.legal_name,
        "Robert Community Builder",
      );
      assert.equal(bobPrivateProfile.private_data!.email, "bob@community.org");

      // Test 3: Role assignments don't leak private data
      console.log("Test 3: Role assignments with privacy maintained");

      await assignRole(
        lynn.cells[0],
        sampleRole(lynn.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_STEWARD,
          description: "Medical advisor for community health initiatives",
        }),
      );

      await assignRole(
        bob.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_COORDINATOR,
          description: "Community resource coordination specialist",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Roles are visible, private data still protected
      const lynnRolesFromBob = await getPersonRoles(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobRolesFromLynn = await getPersonRoles(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.equal(lynnRolesFromBob.roles.length, 1);
      assert.equal(
        lynnRolesFromBob.roles[0].role_name,
        TEST_ROLES.RESOURCE_STEWARD,
      );

      assert.equal(bobRolesFromLynn.roles.length, 1);
      assert.equal(
        bobRolesFromLynn.roles[0].role_name,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      // But cross-agent private data access still denied
      const lynnPublicAfterRole = await getPersonProfile(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobPublicAfterRole = await getPersonProfile(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.isUndefined(lynnPublicAfterRole.private_data);
      assert.isUndefined(bobPublicAfterRole.private_data);

      // Test 4: Capability checking works without private data exposure
      console.log("Test 4: Capability checking with privacy intact");

      const lynnHasSteward = await hasRoleCapability(
        bob.cells[0],
        lynn.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      const bobHasCoordinator = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      assert.isTrue(lynnHasSteward);
      assert.isTrue(bobHasCoordinator);

      const lynnCapLevel = await getCapabilityLevel(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobCapLevel = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.equal(lynnCapLevel, CAPABILITY_LEVELS.STEWARDSHIP);
      assert.equal(bobCapLevel, CAPABILITY_LEVELS.COORDINATION);

      console.log(
        "✅ Privacy and access control workflow completed successfully",
      );
    },
  );
}, 300000);

test("Community scaling and discovery workflow", async () => {
  await runScenarioWithTwoAgents(
    async (_scenario: Scenario, lynn: PlayerApp, bob: PlayerApp) => {
      // Scenario: Community growth, member discovery, and organizational patterns

      console.log("Phase 1: Initial community establishment");

      // Founder establishes community
      await createPerson(
        lynn.cells[0],
        samplePerson({
          name: "Lynn Founder",
          avatar_url: "https://community.org/founder.png",
        }),
      );

      await assignRole(
        lynn.cells[0],
        sampleRole(lynn.agentPubKey, {
          role_name: TEST_ROLES.FOUNDER,
          description: "Community founder and primary governance lead",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Verify initial state
      let allMembers = await getAllPersons(lynn.cells[0]);
      assert.equal(allMembers.persons.length, 1);
      assert.equal(allMembers.persons[0].name, "Lynn Founder");

      console.log("Phase 2: First member joins");

      // Bob joins as first member
      await createPerson(
        bob.cells[0],
        samplePerson({
          name: "Bob FirstMember",
          avatar_url: "https://community.org/member1.png",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      // Community grows
      allMembers = await getAllPersons(lynn.cells[0]);
      assert.equal(allMembers.persons.length, 2);

      const memberNames = allMembers.persons
        .map((person) => person.name)
        .sort();
      assert.deepEqual(memberNames, ["Bob FirstMember", "Lynn Founder"]);

      console.log("Phase 3: Role delegation and capability distribution");

      // Founder delegates steward role to first member
      await assignRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_STEWARD,
          description: "Community steward for new member onboarding",
        }),
      );

      // Founder also assigns coordinator role
      await assignRole(
        lynn.cells[0],
        sampleRole(bob.agentPubKey, {
          role_name: TEST_ROLES.RESOURCE_COORDINATOR,
          description: "Resource coordinator for community assets",
        }),
      );

      await dhtSync([lynn, bob], lynn.cells[0].cell_id[0]);

      console.log("Phase 4: Verify distributed governance structure");

      // Check capability distribution
      const lynnCapability = await getCapabilityLevel(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobCapability = await getCapabilityLevel(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.equal(lynnCapability, CAPABILITY_LEVELS.GOVERNANCE);
      assert.equal(bobCapability, CAPABILITY_LEVELS.COORDINATION);

      // Verify role distribution
      const lynnRoles = await getPersonRoles(bob.cells[0], lynn.agentPubKey);
      const bobRoles = await getPersonRoles(lynn.cells[0], bob.agentPubKey);

      assert.equal(lynnRoles.roles.length, 1);
      assert.equal(lynnRoles.roles[0].role_name, TEST_ROLES.FOUNDER);

      assert.equal(bobRoles.roles.length, 2);
      const bobRoleNames = bobRoles.roles.map((role) => role.role_name).sort();
      assert.deepEqual(bobRoleNames, [
        TEST_ROLES.RESOURCE_COORDINATOR,
        TEST_ROLES.RESOURCE_STEWARD,
      ]);

      console.log("Phase 5: Discovery and interaction patterns");

      // Both agents can discover full community
      const lynnViewOfCommunity = await getAllPersons(lynn.cells[0]);
      const bobViewOfCommunity = await getAllPersons(bob.cells[0]);

      assert.equal(lynnViewOfCommunity.persons.length, 2);
      assert.equal(bobViewOfCommunity.persons.length, 2);

      // Cross-agent profile access works
      const lynnProfileFromBob = await getPersonProfile(
        bob.cells[0],
        lynn.agentPubKey,
      );
      const bobProfileFromLynn = await getPersonProfile(
        lynn.cells[0],
        bob.agentPubKey,
      );

      assert.ok(lynnProfileFromBob.person);
      assert.equal(lynnProfileFromBob.person!.name, "Lynn Founder");

      assert.ok(bobProfileFromLynn.person);
      assert.equal(bobProfileFromLynn.person!.name, "Bob FirstMember");

      console.log("Phase 6: Community readiness for further scaling");

      // Verify the community has proper governance structure for growth

      // Primary accountability established
      const hasFounder = await hasRoleCapability(
        bob.cells[0],
        lynn.agentPubKey,
        TEST_ROLES.FOUNDER,
      );
      assert.isTrue(hasFounder);

      // Distributed coordination roles
      const hasSteward = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_STEWARD,
      );
      const hasCoordinator = await hasRoleCapability(
        lynn.cells[0],
        bob.agentPubKey,
        TEST_ROLES.RESOURCE_COORDINATOR,
      );

      assert.isTrue(hasSteward);
      assert.isTrue(hasCoordinator);

      // Member discovery functioning
      assert.equal(allMembers.persons.length, 2);

      console.log(
        "✅ Community scaling workflow completed - ready for Phase 2 features",
      );
    },
  );
}, 300000);

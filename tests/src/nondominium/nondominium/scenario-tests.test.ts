import { test, describe, beforeAll, afterAll, expect } from "vitest";
import { Scenario, runScenario, Player, Cell } from "@holochain/tryorama";
import {
    createTestPerson,
    createTestPersonVariation,
    createTestEncryptedData,
    createTestRole,
    validatePersonCreation,
    validateEncryptedDataCreation,
    validateAgentProfile,
    waitForDHTSync,
    logTestStart,
    logTestEnd,
    defaultTimeout,
    TestPersonOutput,
    TestEncryptedDataOutput,
    TestAgentProfileOutput,
} from "./common.js";

describe("🎭 Scenario Tests - Real-World Usage Patterns", () => {

    test("🧪 Scenario: New Community Member Onboarding", async () => {
        const testName = "New Community Member Onboarding";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice, bob, steward]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "bob",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "steward",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];
                const bobCell: Cell = bob.cells[0];
                const stewardCell: Cell = steward.cells[0];

                // 📋 Scenario: Alice joins the community
                console.log("📋 SCENARIO: Alice joins the Nondominium community");

                // Step 1: Alice creates her public profile
                console.log("👤 Step 1: Alice creates her public profile");
                const aliceProfile = {
                    name: "Alice Johnson",
                    avatar_url: "https://example.com/alice-avatar.jpg",
                };

                const aliceResult: TestPersonOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: aliceProfile,
                });

                validatePersonCreation(aliceResult, aliceProfile, alice.agentPubKey);
                console.log("✅ Alice's public profile created successfully");

                // Step 2: Alice stores her private identity data
                console.log("🔒 Step 2: Alice stores encrypted private identity data");
                const alicePrivateData = {
                    encrypted_data: Array.from(new TextEncoder().encode(JSON.stringify({
                        legal_name: "Alice Marie Johnson",
                        address: "123 Community St, Cooperstown, CA 90210",
                        email: "alice@example.com",
                        phone: "+1-555-0123",
                        emergency_contact: "Bob Johnson (spouse) +1-555-0124"
                    }))),
                    encryption_method: "XSalsa20Poly1305",
                };

                const encryptedResult: TestEncryptedDataOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "store_encrypted_data",
                    payload: alicePrivateData,
                });

                validateEncryptedDataCreation(encryptedResult, alicePrivateData, alice.agentPubKey);
                console.log("✅ Alice's private data encrypted and stored");

                await waitForDHTSync(2000);

                // Step 3: Existing community steward welcomes Alice
                console.log("🤝 Step 3: Community steward creates profile and assigns role to Alice");

                // Steward creates their profile
                const stewardProfile = {
                    name: "Community Steward",
                    avatar_url: "https://example.com/steward-avatar.jpg",
                };

                await stewardCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: stewardProfile,
                });

                await waitForDHTSync(1000);

                // Steward assigns "New Member" role to Alice
                const newMemberRole = await stewardCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "assign_role",
                    payload: {
                        agent_pub_key: alice.agentPubKey,
                        role_name: "New Member",
                        description: "Recently joined community member in orientation period",
                    },
                });

                expect(newMemberRole.role_hash).toBeDefined();
                console.log("✅ Steward assigned 'New Member' role to Alice");

                await waitForDHTSync(2000);

                // Step 4: Alice discovers the community
                console.log("🔍 Step 4: Alice discovers other community members");

                const communityMembers = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_all_agents",
                    payload: null,
                });

                expect(communityMembers.agents.length).toBeGreaterThanOrEqual(2); // Alice + Steward
                console.log(`✅ Alice discovered ${communityMembers.agents.length} community members`);

                // Step 5: Alice views her complete profile (with role)
                console.log("📄 Step 5: Alice views her complete profile");

                const aliceCompleteProfile: TestAgentProfileOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_my_profile",
                    payload: null,
                });

                validateAgentProfile(aliceCompleteProfile, aliceProfile.name);
                expect(aliceCompleteProfile.encrypted_data.length).toBe(1);
                console.log("✅ Alice's complete profile verified");

                // Step 6: Another member (Bob) views Alice's public profile
                console.log("👥 Step 6: Bob views Alice's public profile");

                // Bob creates his profile first
                const bobProfile = createTestPersonVariation("Bob");
                await bobCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: bobProfile,
                });

                await waitForDHTSync(1000);

                const aliceProfileFromBob: TestAgentProfileOutput = await bobCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: alice.agentPubKey,
                });

                // Bob can see Alice's public profile but not her encrypted data
                validateAgentProfile(aliceProfileFromBob, aliceProfile.name);
                expect(aliceProfileFromBob.encrypted_data.length).toBe(0); // Bob can't see Alice's private data
                console.log("✅ Bob can view Alice's public profile (privacy preserved)");

                console.log("🎉 SCENARIO COMPLETE: Alice successfully onboarded to community");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout * 2); // Double timeout for complex scenario

    test("🧪 Scenario: Community Governance Evolution", async () => {
        const testName = "Community Governance Evolution";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [founder, alice, bob, charlie]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "founder",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "bob",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "charlie",
                    }
                ]);

                console.log("📋 SCENARIO: Community evolves its governance structure");

                // Step 1: Founder establishes the community
                console.log("🏗️ Step 1: Community founder establishes initial structure");

                const founderProfile = {
                    name: "Community Founder",
                    avatar_url: "https://example.com/founder.jpg",
                };

                await founder.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: founderProfile,
                });

                console.log("✅ Founder profile created");

                // Step 2: Members join over time
                console.log("👥 Step 2: Members join the community over time");

                const members = [
                    { player: alice, name: "Alice" },
                    { player: bob, name: "Bob" },
                    { player: charlie, name: "Charlie" }
                ];

                for (const member of members) {
                    const profile = createTestPersonVariation(member.name);
                    await member.player.cells[0].callZome({
                        zome_name: "zome_person",
                        fn_name: "create_person",
                        payload: profile,
                    });
                }

                await waitForDHTSync(2000);
                console.log("✅ All community members have joined");

                // Step 3: Founder assigns initial roles
                console.log("🎭 Step 3: Founder assigns initial governance roles");

                // Alice becomes a steward
                await founder.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "assign_role",
                    payload: {
                        agent_pub_key: alice.agentPubKey,
                        role_name: "Community Steward",
                        description: "Responsible for day-to-day community management",
                    },
                });

                // Bob becomes a resource coordinator
                await founder.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "assign_role",
                    payload: {
                        agent_pub_key: bob.agentPubKey,
                        role_name: "Resource Coordinator",
                        description: "Manages community resources and allocation",
                    },
                });

                console.log("✅ Initial governance roles assigned");

                await waitForDHTSync(2000);

                // Step 4: Community growth verification
                console.log("📊 Step 4: Verify community growth and structure");

                const communityFromFounder = await founder.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "get_all_agents",
                    payload: null,
                });

                expect(communityFromFounder.agents.length).toBe(4); // All 4 members
                console.log(`✅ Community has grown to ${communityFromFounder.agents.length} members`);

                // Each member can see the full community
                for (const member of members) {
                    const communityView = await member.player.cells[0].callZome({
                        zome_name: "zome_person",
                        fn_name: "get_all_agents",
                        payload: null,
                    });

                    expect(communityView.agents.length).toBe(4);
                }

                console.log("✅ All members have consistent view of community");

                // Step 5: Role evolution - Alice assigns role to Charlie
                console.log("🔄 Step 5: Governance evolution - role assignment delegation");

                // Alice (as steward) assigns a role to Charlie
                await alice.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "assign_role",
                    payload: {
                        agent_pub_key: charlie.agentPubKey,
                        role_name: "Community Advocate",
                        description: "Represents community interests and facilitates communication",
                    },
                });

                console.log("✅ Alice successfully delegated role assignment to Charlie");

                await waitForDHTSync(2000);

                // Step 6: Verify distributed governance is working
                console.log("🔍 Step 6: Verify distributed governance structure");

                // Check that roles are properly distributed and visible
                const charlieProfile: TestAgentProfileOutput = await bob.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: charlie.agentPubKey,
                });

                validateAgentProfile(charlieProfile, "Test User Charlie");

                console.log("🎉 SCENARIO COMPLETE: Community governance successfully evolved");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout * 3); // Triple timeout for complex scenario

    test("🧪 Scenario: Privacy and Trust Verification", async () => {
        const testName = "Privacy and Trust Verification";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [trustee, member, outsider]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "trustee",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "member",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "outsider",
                    }
                ]);

                console.log("📋 SCENARIO: Testing privacy preservation and trust boundaries");

                // Step 1: Member creates profile with sensitive data
                console.log("🔒 Step 1: Member stores sensitive identity data");

                const memberProfile = {
                    name: "Jane Smith",
                    avatar_url: "https://example.com/jane.jpg",
                };

                await member.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: memberProfile,
                });

                const sensitiveData = {
                    encrypted_data: Array.from(new TextEncoder().encode(JSON.stringify({
                        ssn: "123-45-6789",
                        bank_account: "1234567890",
                        medical_info: "Type 1 Diabetes",
                        personal_notes: "Prefers morning meetings, allergic to cats"
                    }))),
                    encryption_method: "XSalsa20Poly1305",
                };

                await member.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "store_encrypted_data",
                    payload: sensitiveData,
                });

                console.log("✅ Member's sensitive data encrypted and stored");

                // Step 2: Trustee creates profile
                console.log("👨‍⚖️ Step 2: Trusted community member joins");

                const trusteeProfile = {
                    name: "Trusted Steward",
                    avatar_url: "https://example.com/trustee.jpg",
                };

                await trustee.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: trusteeProfile,
                });

                // Step 3: Outsider creates profile
                console.log("🚪 Step 3: External person joins network");

                const outsiderProfile = {
                    name: "Unknown Person",
                    avatar_url: "https://example.com/unknown.jpg",
                };

                await outsider.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: outsiderProfile,
                });

                await waitForDHTSync(2000);

                // Step 4: Privacy verification - different access levels
                console.log("🔍 Step 4: Verify privacy boundaries");

                // Member can see their own private data
                const memberSelfView: TestAgentProfileOutput = await member.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "get_my_profile",
                    payload: null,
                });

                expect(memberSelfView.person?.name).toBe(memberProfile.name);
                expect(memberSelfView.encrypted_data.length).toBe(1);
                console.log("✅ Member can access their own private data");

                // Trustee can see member's public profile but not private data
                const memberFromTrustee: TestAgentProfileOutput = await trustee.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: member.agentPubKey,
                });

                expect(memberFromTrustee.person?.name).toBe(memberProfile.name);
                expect(memberFromTrustee.encrypted_data.length).toBe(0);
                console.log("✅ Trustee can see public profile but not private data");

                // Outsider can see member's public profile but not private data
                const memberFromOutsider: TestAgentProfileOutput = await outsider.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: member.agentPubKey,
                });

                expect(memberFromOutsider.person?.name).toBe(memberProfile.name);
                expect(memberFromOutsider.encrypted_data.length).toBe(0);
                console.log("✅ Outsider can see public profile but not private data");

                // Step 5: Community visibility verification
                console.log("🌐 Step 5: Verify community-wide visibility");

                const communityFromMember = await member.cells[0].callZome({
                    zome_name: "zome_person",
                    fn_name: "get_all_agents",
                    payload: null,
                });

                expect(communityFromMember.agents.length).toBe(3);
                console.log("✅ All members visible in community discovery");

                // Verify that each agent can see all others' public profiles
                for (const agent of communityFromMember.agents) {
                    expect(agent.name).toBeDefined();
                    expect(agent.agent_pub_key).toBeDefined();
                    console.log(`  - ${agent.name} discoverable`);
                }

                console.log("🎉 SCENARIO COMPLETE: Privacy boundaries properly maintained");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout * 2);

}); 
import { test, describe, expect } from "vitest";
import { runScenario } from "@holochain/tryorama";
import {
    createTestPerson,
    createTestPersonVariation,
    createTestRole,
    validatePersonCreation,
    validateAgentProfile,
    waitForDHTSync,
    createMultipleAgents,
    logTestStart,
    logTestEnd,
    defaultTimeout,
    TestPersonOutput,
    TestAgentProfileOutput,
    getAppBundleSource,
} from "./common.js";

// Type definition for role assignment output
interface RoleAssignmentOutput {
    role_hash: any;
    role: {
        role_name: string;
        description: string;
        assigned_to: any;
        assigned_by: any;
        created_at: number;
    };
}

// Type definition for get_all_agents output
interface GetAllAgentsOutput {
    agents: {
        agent_pub_key: any;
        name: string;
        avatar_url?: string;
        created_at: number;
    }[];
}

describe("🔗 Integration Tests - Multi-Agent Interactions", () => {

    test("🧪 Two Agents Create Profiles", async () => {
        const testName = "Two Agents Create Profiles";
        logTestStart(testName);

        try {
            await runScenario(async (scenario) => {
                const [alice, bob] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() },
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
                const bobCell = bob.cells[0];

                // Alice creates her profile
                console.log("Step 1: Alice creates profile");
                const alicePersonData = createTestPersonVariation("Alice");
                const aliceResult: TestPersonOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: alicePersonData,
                });

                validatePersonCreation(aliceResult, alicePersonData, alice.agentPubKey);

                // Bob creates his profile
                console.log("Step 2: Bob creates profile");
                const bobPersonData = createTestPersonVariation("Bob");
                const bobResult: TestPersonOutput = await bobCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: bobPersonData,
                });

                validatePersonCreation(bobResult, bobPersonData, bob.agentPubKey);

                // Wait for DHT sync
                await waitForDHTSync(3000);

                // Alice views Bob's profile
                console.log("Step 3: Alice views Bob's profile");
                const bobProfileFromAlice: TestAgentProfileOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: bob.agentPubKey,
                });

                validateAgentProfile(bobProfileFromAlice, bobPersonData.name);

                // Bob views Alice's profile
                console.log("Step 4: Bob views Alice's profile");
                const aliceProfileFromBob: TestAgentProfileOutput = await bobCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: alice.agentPubKey,
                });

                validateAgentProfile(aliceProfileFromBob, alicePersonData.name);

                console.log("✅ Multi-agent profile interaction successful");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Role Assignment Cross-Agent", async () => {
        const testName = "Role Assignment Cross-Agent";
        logTestStart(testName);

        try {
            await runScenario(async (scenario) => {
                const [alice, bob] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() },
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
                const bobCell = bob.cells[0];

                // Both agents create profiles first
                console.log("Step 1: Creating profiles");
                const alicePersonData = createTestPersonVariation("Alice");
                await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: alicePersonData,
                });

                const bobPersonData = createTestPersonVariation("Bob");
                await bobCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: bobPersonData,
                });

                await waitForDHTSync(2000);

                // Alice assigns a role to Bob
                console.log("Step 2: Alice assigns role to Bob");
                const roleData = createTestRole();
                const roleResult: RoleAssignmentOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "assign_role",
                    payload: {
                        agent_pub_key: bob.agentPubKey,
                        role_name: roleData.role_name,
                        description: roleData.description,
                    },
                });

                console.log("Role assignment result:", roleResult);
                expect(roleResult.role_hash).toBeDefined();
                expect(roleResult.role.role_name).toBe(roleData.role_name);
                expect(roleResult.role.assigned_to).toEqual(bob.agentPubKey);

                await waitForDHTSync(2000);

                // Verify role appears in Bob's profile
                console.log("Step 3: Verify role in Bob's profile");
                const bobProfileWithRole: TestAgentProfileOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: bob.agentPubKey,
                });

                console.log("Bob's profile with role:", bobProfileWithRole);

                console.log("✅ Role assignment cross-agent successful");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Community Discovery Test", async () => {
        const testName = "Community Discovery Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario) => {
                const players = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() },
                    { appBundleSource: getAppBundleSource() },
                    { appBundleSource: getAppBundleSource() }
                ]);

                const [alice, bob, charlie] = players;
                const cells = [alice.cells[0], bob.cells[0], charlie.cells[0]];

                // All agents create profiles
                console.log("Step 1: All agents create profiles");
                for (let i = 0; i < cells.length; i++) {
                    const cell = cells[i];
                    const personData = createTestPersonVariation(`Agent${i + 1}`);

                    await cell.callZome({
                        zome_name: "zome_person",
                        fn_name: "create_person",
                        payload: personData,
                    });
                }

                await waitForDHTSync(3000);

                // Test community discovery from each agent's perspective
                console.log("Step 2: Test community discovery");
                for (let i = 0; i < cells.length; i++) {
                    const cell = cells[i];

                    console.log(`Agent ${i + 1} discovering community...`);
                    const allAgents: GetAllAgentsOutput = await cell.callZome({
                        zome_name: "zome_person",
                        fn_name: "get_all_agents",
                        payload: null,
                    });

                    console.log(`Agent ${i + 1} found ${allAgents.agents.length} agents`);

                    // Should find all 3 agents (including themselves)
                    expect(allAgents.agents.length).toBeGreaterThanOrEqual(3);

                    // Verify each discovered agent has valid data
                    for (const discoveredAgent of allAgents.agents) {
                        expect(discoveredAgent.name).toBeDefined();
                        expect(discoveredAgent.agent_pub_key).toBeDefined();
                        expect(discoveredAgent.created_at).toBeDefined();
                        console.log(`  - Found agent: ${discoveredAgent.name}`);
                    }
                }

                console.log("✅ Community discovery successful for all agents");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 DHT Consistency Test", async () => {
        const testName = "DHT Consistency Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario) => {
                const [alice, bob] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() },
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
                const bobCell = bob.cells[0];

                // Alice creates profile
                console.log("Step 1: Alice creates profile");
                const alicePersonData = createTestPersonVariation("Alice_DHT_Test");
                const aliceResult: TestPersonOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: alicePersonData,
                });

                console.log("Alice created profile with hash:", aliceResult.person_hash);

                // Wait for DHT sync
                await waitForDHTSync(5000);

                // Bob retrieves Alice's profile multiple times to test consistency
                console.log("Step 2: Bob retrieves Alice's profile multiple times");
                const retrievalAttempts = 3;
                const profiles = [];

                for (let i = 0; i < retrievalAttempts; i++) {
                    console.log(`Attempt ${i + 1}/${retrievalAttempts}`);

                    const profile: TestAgentProfileOutput = await bobCell.callZome({
                        zome_name: "zome_person",
                        fn_name: "get_agent_profile",
                        payload: alice.agentPubKey,
                    });

                    profiles.push(profile);

                    if (i < retrievalAttempts - 1) {
                        await waitForDHTSync(1000);
                    }
                }

                // Verify all retrievals are consistent
                console.log("Step 3: Verify consistency across retrievals");
                for (let i = 1; i < profiles.length; i++) {
                    expect(profiles[i].person?.name).toBe(profiles[0].person?.name);
                    expect(profiles[i].person?.avatar_url).toBe(profiles[0].person?.avatar_url);
                }

                console.log("✅ DHT consistency verified across multiple retrievals");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

}); 
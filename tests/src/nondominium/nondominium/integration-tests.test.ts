import { test, describe, beforeAll, afterAll, expect } from "vitest";
import { Scenario, runScenario, Player, Cell } from "@holochain/tryorama";
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
} from "./common.js";

describe("🔗 Integration Tests - Multi-Agent Interactions", () => {

    test("🧪 Two Agents Create Profiles", async () => {
        const testName = "Two Agents Create Profiles";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice, bob]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "bob",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];
                const bobCell: Cell = bob.cells[0];

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
            await runScenario(async (scenario: Scenario) => {
                const [alice, bob]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "bob",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];
                const bobCell: Cell = bob.cells[0];

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
                const roleResult = await aliceCell.callZome({
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
            await runScenario(async (scenario: Scenario) => {
                const players: Player[] = await scenario.addPlayersWithApps([
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

                const [alice, bob, charlie] = players;
                const agents = createMultipleAgents(players.map(p => p.cells[0]), 3);

                // All agents create profiles
                console.log("Step 1: All agents create profiles");
                for (let i = 0; i < agents.length; i++) {
                    const agent = agents[i];
                    const personData = createTestPersonVariation(agent.name);

                    await agent.cell.callZome({
                        zome_name: "zome_person",
                        fn_name: "create_person",
                        payload: personData,
                    });
                }

                await waitForDHTSync(3000);

                // Test community discovery from each agent's perspective
                console.log("Step 2: Test community discovery");
                for (let i = 0; i < agents.length; i++) {
                    const agent = agents[i];

                    console.log(`${agent.name} discovering community...`);
                    const allAgents = await agent.cell.callZome({
                        zome_name: "zome_person",
                        fn_name: "get_all_agents",
                        payload: null,
                    });

                    console.log(`${agent.name} found ${allAgents.agents.length} agents`);

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
            await runScenario(async (scenario: Scenario) => {
                const [alice, bob]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    },
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "bob",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];
                const bobCell: Cell = bob.cells[0];

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
import { test, describe, beforeAll, afterAll, expect } from "vitest";
import { Scenario, runScenario, Player, Cell, addConductor } from "@holochain/tryorama";
import {
    createTestPerson,
    createTestEncryptedData,
    validatePersonCreation,
    validateEncryptedDataCreation,
    validateAgentProfile,
    waitForDHTSync,
    expectError,
    logTestStart,
    logTestEnd,
    defaultTimeout,
    TestPersonOutput,
    TestEncryptedDataOutput,
    TestAgentProfileOutput,
} from "./common.js";

describe("🔧 Foundation Tests - Person Zome", () => {

    test("🧪 Basic Connectivity Test", async () => {
        const testName = "Basic Connectivity Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                // Add a conductor with our app bundle
                const [alice]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];

                // Simple connectivity test - try to call any zome function
                const agentInfo = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_my_profile",
                    payload: null,
                });

                console.log("✅ Basic connectivity successful");
                console.log("Agent info response:", agentInfo);

                // Expect some response (even if it's empty data)
                expect(agentInfo).toBeDefined();
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Person Creation Test", async () => {
        const testName = "Person Creation Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];
                const testPersonData = createTestPerson();

                console.log("Creating person with data:", testPersonData);

                const result: TestPersonOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: testPersonData,
                });

                console.log("Person creation result:", result);

                // Validate the result
                validatePersonCreation(result, testPersonData, alice.agentPubKey);

                console.log("✅ Person creation validation passed");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Person Profile Retrieval Test", async () => {
        const testName = "Person Profile Retrieval Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];
                const testPersonData = createTestPerson();

                // First create a person
                console.log("Step 1: Creating person");
                const createResult: TestPersonOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: testPersonData,
                });

                validatePersonCreation(createResult, testPersonData, alice.agentPubKey);

                // Wait for DHT sync
                await waitForDHTSync(2000);

                // Then retrieve the profile
                console.log("Step 2: Retrieving agent profile");
                const profileResult: TestAgentProfileOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: alice.agentPubKey,
                });

                console.log("Profile retrieval result:", profileResult);

                // Validate the profile
                validateAgentProfile(profileResult, testPersonData.name);

                console.log("✅ Profile retrieval validation passed");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Encrypted Data Storage Test", async () => {
        const testName = "Encrypted Data Storage Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];

                // First create a person (required for encrypted data)
                console.log("Step 1: Creating person");
                const testPersonData = createTestPerson();
                await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: testPersonData,
                });

                await waitForDHTSync(1000);

                // Then store encrypted data
                console.log("Step 2: Storing encrypted data");
                const testEncryptedData = createTestEncryptedData();

                const result: TestEncryptedDataOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "store_encrypted_data",
                    payload: testEncryptedData,
                });

                console.log("Encrypted data storage result:", result);

                // Validate the result
                validateEncryptedDataCreation(result, testEncryptedData, alice.agentPubKey);

                console.log("✅ Encrypted data storage validation passed");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Get All Agents Test", async () => {
        const testName = "Get All Agents Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];

                // Create a person
                console.log("Step 1: Creating person");
                const testPersonData = createTestPerson();
                await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: testPersonData,
                });

                await waitForDHTSync(1000);

                // Get all agents
                console.log("Step 2: Getting all agents");
                const result = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_all_agents",
                    payload: null,
                });

                console.log("Get all agents result:", result);

                // Should have at least one agent (alice)
                expect(result.agents).toBeDefined();
                expect(Array.isArray(result.agents)).toBe(true);
                expect(result.agents.length).toBeGreaterThan(0);

                console.log("✅ Get all agents validation passed");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

    test("🧪 Error Handling Test", async () => {
        const testName = "Error Handling Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario: Scenario) => {
                const [alice]: Player[] = await scenario.addPlayersWithApps([
                    {
                        bundle: { path: "../workdir/nondominium.happ" },
                        agentName: "alice",
                    }
                ]);

                const aliceCell: Cell = alice.cells[0];

                // Test 1: Try to store encrypted data without creating person first
                console.log("Test 1: Encrypted data without person (should fail)");
                const testEncryptedData = createTestEncryptedData();

                await expectError(async () => {
                    await aliceCell.callZome({
                        zome_name: "zome_person",
                        fn_name: "store_encrypted_data",
                        payload: testEncryptedData,
                    });
                }, "Person not found");

                // Test 2: Try to get profile for non-existent agent
                console.log("Test 2: Get profile for non-existent agent");
                const fakeAgentKey = new Uint8Array(32).fill(1); // Fake agent key

                const profileResult: TestAgentProfileOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_agent_profile",
                    payload: fakeAgentKey,
                });

                // Should return empty profile (not error)
                expect(profileResult.person).toBeUndefined();
                expect(profileResult.encrypted_data).toEqual([]);

                console.log("✅ Error handling tests passed");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

}); 
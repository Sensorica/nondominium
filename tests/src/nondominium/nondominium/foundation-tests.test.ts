import { test, describe, expect } from "vitest";
import { runScenario } from "@holochain/tryorama";
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
    getAppBundleSource,
    TestPersonOutput,
    TestEncryptedDataOutput,
    TestAgentProfileOutput,
} from "./common.js";

// Type definition for get_all_agents output
interface GetAllAgentsOutput {
    agents: {
        agent_pub_key: any;
        name: string;
        avatar_url?: string;
        created_at: number;
    }[];
}

describe("🔧 Foundation Tests - Person Zome", () => {

    test("🧪 Basic Connectivity Test", async () => {
        const testName = "Basic Connectivity Test";
        logTestStart(testName);

        try {
            await runScenario(async (scenario) => {
                // Add a player with our app bundle - using correct AppWithOptions format
                const [alice] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];

                // Simple connectivity test - try to call get_my_profile
                const agentInfo: TestAgentProfileOutput = await aliceCell.callZome({
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
            await runScenario(async (scenario) => {
                const [alice] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
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
            await runScenario(async (scenario) => {
                const [alice] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
                const testPersonData = createTestPerson();

                // First create a person
                console.log("Creating person for profile test:", testPersonData);
                await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: testPersonData,
                });

                // Wait for DHT sync
                await waitForDHTSync(2000);

                // Now retrieve the profile
                const profile: TestAgentProfileOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_my_profile",
                    payload: null,
                });

                console.log("Retrieved profile:", profile);

                // Validate the profile
                validateAgentProfile(profile, testPersonData.name);

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
            await runScenario(async (scenario) => {
                const [alice] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
                const testEncryptedData = createTestEncryptedData();

                console.log("Creating encrypted data:", testEncryptedData);

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
            await runScenario(async (scenario) => {
                const [alice] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];
                const testPersonData = createTestPerson();

                // First create a person
                console.log("Creating person for agents test:", testPersonData);
                await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "create_person",
                    payload: testPersonData,
                });

                // Wait for DHT sync
                await waitForDHTSync(2000);

                // Now get all agents
                const agents: GetAllAgentsOutput = await aliceCell.callZome({
                    zome_name: "zome_person",
                    fn_name: "get_all_agents",
                    payload: null,
                });

                console.log("All agents response:", agents);

                // Validate we have at least one agent
                expect(agents).toBeDefined();
                expect(agents.agents).toBeDefined();
                expect(Array.isArray(agents.agents)).toBe(true);
                expect(agents.agents.length).toBeGreaterThan(0);

                // Validate the agent data structure
                const agent = agents.agents[0];
                expect(agent.name).toBe(testPersonData.name);
                expect(agent.avatar_url).toBe(testPersonData.avatar_url);
                expect(agent.created_at).toBeDefined();

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
            await runScenario(async (scenario) => {
                const [alice] = await scenario.addPlayersWithApps([
                    { appBundleSource: getAppBundleSource() }
                ]);

                const aliceCell = alice.cells[0];

                // Test calling a non-existent function
                await expectError(async () => {
                    await aliceCell.callZome({
                        zome_name: "zome_person",
                        fn_name: "non_existent_function",
                        payload: null,
                    });
                });

                // Test calling with invalid payload
                await expectError(async () => {
                    await aliceCell.callZome({
                        zome_name: "zome_person",
                        fn_name: "create_person",
                        payload: { invalid: "data structure" },
                    });
                });

                console.log("✅ Error handling validation passed");
            });

            logTestEnd(testName, true);
        } catch (error) {
            logTestEnd(testName, false);
            throw error;
        }
    }, defaultTimeout);

}); 
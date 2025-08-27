import { assert, test } from "vitest";
import { Scenario, PlayerApp, dhtSync } from "@holochain/tryorama";

import {
  sampleResourceSpecification,
  sampleEconomicResource,
  sampleGovernanceRule,
  createResourceSpecification,
  createEconomicResource,
  createGovernanceRule,
  getAllResourceSpecifications,
  getAllEconomicResources,
  getAllGovernanceRules,
  getResourceSpecificationWithRules,
  checkFirstResourceRequirement,
  transferCustody,
  updateResourceState,
  getResourcesBySpecification,
  getMyEconomicResources,
  getAgentEconomicResources,
  validateResourceSpecificationData,
  validateEconomicResourceData,
  validateGovernanceRuleData,  
  RESOURCE_STATES,
  TEST_CATEGORIES,
  TEST_TAGS,
  ResourceTestContext,
  setupBasicResources,
  setupResourcesWithGovernance,
} from "./common";
import {
  ResourceSpecification,
  EconomicResource,
  GovernanceRule,
  CreateResourceSpecificationOutput,
  CreateEconomicResourceOutput,
} from "@nondominium/shared-types";
import { runScenarioWithTwoAgents } from "../utils.js";

test(
  "Complete resource lifecycle workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Complete resource lifecycle from specification to retirement

        // Step 1: Alice creates a resource specification with governance rules
        console.log("Step 1: Alice creates resource specification with governance");
        const toolSpec = await createResourceSpecification(
          alice.cells[0],
          sampleResourceSpecification({
            name: "Community 3D Printer",
            description: "High-precision 3D printer for community projects",
            category: TEST_CATEGORIES.EQUIPMENT,
            image_url: "https://example.com/3d-printer.jpg",
            tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY, TEST_TAGS.VERIFIED],
            governance_rules: [
              {
                rule_type: "access_requirement",
                rule_data: JSON.stringify({ 
                  certification_required: true,
                  min_training_hours: 10 
                }),
                enforced_by: "Equipment Steward",
              },
              {
                rule_type: "usage_limit",
                rule_data: JSON.stringify({ 
                  max_hours_per_session: 4,
                  max_sessions_per_week: 3,
                  booking_advance_days: 7 
                }),
                enforced_by: "Resource Coordinator",
              },
              {
                rule_type: "maintenance_schedule",
                rule_data: JSON.stringify({ 
                  cleaning_after_each_use: true,
                  professional_service_months: 6,
                  calibration_weeks: 2 
                }),
                enforced_by: "Technical Steward",
              },
            ],
          })
        );

        console.log(`✅ Created resource specification: ${toolSpec.spec_hash}`);
        console.log(`✅ Created ${toolSpec.governance_rule_hashes.length} governance rules`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Step 2: Bob can discover and review the specification
        console.log("Step 2: Bob discovers and reviews specification");
        const specWithRules = await getResourceSpecificationWithRules(
          bob.cells[0],
          toolSpec.spec_hash
        );

        assert.ok(specWithRules.specification);
        assert.equal(specWithRules.specification!.name, "Community 3D Printer");
        assert.equal(specWithRules.governance_rules.length, 3);

        const ruleTypes = specWithRules.governance_rules.map(r => r.rule_type);
        assert.includes(ruleTypes, "access_requirement");
        assert.includes(ruleTypes, "usage_limit");
        assert.includes(ruleTypes, "maintenance_schedule");

        console.log(`✅ Bob can see specification with ${specWithRules.governance_rules.length} governance rules`);

        // Step 3: Alice creates the actual economic resource
        console.log("Step 3: Alice creates the physical resource");
        const printerResource = await createEconomicResource(
          alice.cells[0],
          sampleEconomicResource(toolSpec.spec_hash, {
            quantity: 1.0,
            unit: "printer",
            current_location: "Community Workshop - Station 1",
          })
        );

        console.log(`✅ Created economic resource: ${printerResource.resource_hash}`);
        assert.equal(printerResource.resource.state, RESOURCE_STATES.PENDING);
        assert.equal(printerResource.resource.custodian.toString(), alice.agentPubKey.toString());

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Step 4: Resource activation and state management
        console.log("Step 4: Resource validation and activation");
        
        // Alice validates and activates the resource
        const activationResult = await updateResourceState(
          alice.cells[0],
          {
            resource_hash: printerResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }
        );

        assert.ok(activationResult);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify resource is active and visible to both agents
        const allResources = await getAllEconomicResources(bob.cells[0]);
        const activePrinter = allResources.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(activePrinter);
        assert.equal(activePrinter!.state, RESOURCE_STATES.ACTIVE);
        assert.equal(activePrinter!.current_location, "Community Workshop - Station 1");

        console.log(`✅ Resource activated and visible to all community members`);

        // Step 5: Custody transfer to dedicated resource steward
        console.log("Step 5: Custody transfer to resource steward");
        
        const custodyTransfer = await transferCustody(
          alice.cells[0],
          {
            resource_hash: printerResource.resource_hash,
            new_custodian: bob.agentPubKey,
          }
        );

        assert.ok(custodyTransfer.updated_resource_hash);
        assert.equal(custodyTransfer.updated_resource.custodian.toString(), bob.agentPubKey.toString());

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify custody links are updated
        const aliceResourcesAfterTransfer = await getMyEconomicResources(alice.cells[0]);
        const bobResourcesAfterTransfer = await getMyEconomicResources(bob.cells[0]);

        assert.equal(aliceResourcesAfterTransfer.length, 0);
        assert.equal(bobResourcesAfterTransfer.length, 1);

        console.log(`✅ Custody successfully transferred to resource steward (Bob)`);

        // Step 6: Resource maintenance cycle
        console.log("Step 6: Resource maintenance cycle");
        
        // Bob performs maintenance
        const maintenanceResult = await updateResourceState(
          bob.cells[0],
          {
            resource_hash: custodyTransfer.updated_resource_hash,
            new_state: RESOURCE_STATES.MAINTENANCE,
          }
        );

        assert.ok(maintenanceResult);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify resource is in maintenance state
        const resourcesInMaintenance = await getAllEconomicResources(alice.cells[0]);
        const maintenancePrinter = resourcesInMaintenance.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(maintenancePrinter);
        assert.equal(maintenancePrinter!.state, RESOURCE_STATES.MAINTENANCE);

        console.log(`✅ Resource in maintenance state - not available for use`);

        // Return to active state after maintenance
        await updateResourceState(
          bob.cells[0],
          {
            resource_hash: custodyTransfer.updated_resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        console.log(`✅ Resource maintenance completed - back to active state`);

        // Step 7: First resource requirement validation
        console.log("Step 7: Community resource contribution validation");
        
        const aliceHasContributed = await checkFirstResourceRequirement(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobHasContributed = await checkFirstResourceRequirement(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.isTrue(aliceHasContributed); // Alice created the resource
        assert.isFalse(bobHasContributed); // Bob only manages it

        console.log(`✅ Resource contribution tracking working correctly`);

        // Final verification: Complete resource ecosystem
        console.log("Final verification: Complete resource ecosystem");

        // Verify specification and resource relationship
        const resourcesBySpec = await getResourcesBySpecification(
          alice.cells[0],
          toolSpec.spec_hash
        );
        assert.equal(resourcesBySpec.length, 1);

        // Verify governance rules are still linked
        const finalSpecWithRules = await getResourceSpecificationWithRules(
          alice.cells[0],
          toolSpec.spec_hash
        );
        assert.equal(finalSpecWithRules.governance_rules.length, 3);

        // Verify community visibility
        const finalAllSpecs = await getAllResourceSpecifications(bob.cells[0]);
        const finalAllResources = await getAllEconomicResources(alice.cells[0]);

        assert.equal(finalAllSpecs.specifications.length, 1);
        assert.equal(finalAllResources.resources.length, 1);

        console.log("✅ Complete resource lifecycle workflow successful");
        console.log(`   - Resource specification created with 3 governance rules`);
        console.log(`   - Economic resource created and activated`);
        console.log(`   - Custody transferred to dedicated steward`);
        console.log(`   - Maintenance cycle completed`);
        console.log(`   - Community visibility and governance maintained`);
      }
    );
  },
  { timeout: 300000 } // 5 minutes for complex scenario
);

test(
  "Community resource sharing and governance workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Multiple agents contributing and managing shared resources

        console.log("Setup: Community resource sharing ecosystem");

        // Phase 1: Alice establishes community workshop resources
        console.log("Phase 1: Alice establishes workshop infrastructure");
        
        const workshopSpecs = await Promise.all([
          createResourceSpecification(
            alice.cells[0],
            sampleResourceSpecification({
              name: "Workshop Space",
              description: "Shared workspace for community projects",
              category: TEST_CATEGORIES.SPACE,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY],
              governance_rules: [
                {
                  rule_type: "access_hours",
                  rule_data: JSON.stringify({ 
                    open_hours: "9AM-9PM",
                    max_session_hours: 8 
                  }),
                  enforced_by: "Space Coordinator",
                },
              ],
            })
          ),
          createResourceSpecification(
            alice.cells[0],
            sampleResourceSpecification({
              name: "Power Tools Set",
              description: "Professional grade power tools for woodworking",
              category: TEST_CATEGORIES.TOOLS,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.VERIFIED],
              governance_rules: [
                {
                  rule_type: "safety_certification",
                  rule_data: JSON.stringify({ 
                    certification_required: true,
                    safety_training_hours: 4 
                  }),
                  enforced_by: "Safety Officer",
                },
                {
                  rule_type: "maintenance_protocol",
                  rule_data: JSON.stringify({ 
                    clean_after_use: true,
                    report_issues: true,
                    monthly_inspection: true 
                  }),
                  enforced_by: "Tool Steward",
                },
              ],
            })
          ),
        ]);

        const [spaceSpec, toolsSpec] = workshopSpecs;

        console.log(`✅ Created workshop space specification: ${spaceSpec.spec_hash}`);
        console.log(`✅ Created tools specification: ${toolsSpec.spec_hash}`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 2: Bob contributes complementary resources
        console.log("Phase 2: Bob contributes complementary resources");
        
        const bobSpecs = await Promise.all([
          createResourceSpecification(
            bob.cells[0],
            sampleResourceSpecification({
              name: "3D Printing Station",
              description: "Advanced 3D printing setup with multiple printers",
              category: TEST_CATEGORIES.EQUIPMENT,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY, TEST_TAGS.VERIFIED],
              governance_rules: [
                {
                  rule_type: "material_usage",
                  rule_data: JSON.stringify({ 
                    material_fee_per_gram: 0.05,
                    max_print_time_hours: 12,
                    advance_booking_required: true 
                  }),
                  enforced_by: "3D Print Coordinator",
                },
              ],
            })
          ),
          createResourceSpecification(
            bob.cells[0],
            sampleResourceSpecification({
              name: "Electronics Lab",
              description: "Electronics prototyping and testing equipment",
              category: TEST_CATEGORIES.SPACE,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.EXPERIMENTAL],
              governance_rules: [
                {
                  rule_type: "skill_requirement",
                  rule_data: JSON.stringify({ 
                    electronics_experience: "intermediate",
                    soldering_certification: true 
                  }),
                  enforced_by: "Electronics Mentor",
                },
              ],
            })
          ),
        ]);

        const [printingSpec, electronicsSpec] = bobSpecs;

        console.log(`✅ Bob created 3D printing specification: ${printingSpec.spec_hash}`);
        console.log(`✅ Bob created electronics lab specification: ${electronicsSpec.spec_hash}`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 3: Create economic resources for all specifications
        console.log("Phase 3: Creating physical resources");
        
        const workshopResources = await Promise.all([
          createEconomicResource(
            alice.cells[0],
            sampleEconomicResource(spaceSpec.spec_hash, {
              quantity: 1.0,
              unit: "space",
              current_location: "Building A - Floor 2",
            })
          ),
          createEconomicResource(
            alice.cells[0],
            sampleEconomicResource(toolsSpec.spec_hash, {
              quantity: 1.0,
              unit: "set",
              current_location: "Workshop - Tool Cabinet",
            })  
          ),
          createEconomicResource(
            bob.cells[0],
            sampleEconomicResource(printingSpec.spec_hash, {
              quantity: 3.0,
              unit: "printers",
              current_location: "Workshop - 3D Print Corner",
            })
          ),
          createEconomicResource(
            bob.cells[0],
            sampleEconomicResource(electronicsSpec.spec_hash, {
              quantity: 1.0,
              unit: "lab",
              current_location: "Building A - Floor 1 - Room 105",
            })
          ),
        ]);

        const [spaceResource, toolsResource, printingResource, electronicsResource] = workshopResources;

        console.log(`✅ Created ${workshopResources.length} physical resources`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 4: Activate all resources
        console.log("Phase 4: Resource activation and availability");
        
        await Promise.all([
          updateResourceState(alice.cells[0], {
            resource_hash: spaceResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }),
          updateResourceState(alice.cells[0], {
            resource_hash: toolsResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }),
          updateResourceState(bob.cells[0], {
            resource_hash: printingResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }),
          updateResourceState(bob.cells[0], {
            resource_hash: electronicsResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }),
        ]);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        console.log(`✅ All resources activated and available`);

        // Phase 5: Cross-agent resource discovery and validation
        console.log("Phase 5: Community resource discovery");
        
        const allSpecsFromAlice = await getAllResourceSpecifications(alice.cells[0]);
        const allSpecsFromBob = await getAllResourceSpecifications(bob.cells[0]);
        const allResourcesFromAlice = await getAllEconomicResources(alice.cells[0]);
        const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

        // Both agents should see all 4 specifications and 4 resources
        assert.equal(allSpecsFromAlice.specifications.length, 4);
        assert.equal(allSpecsFromBob.specifications.length, 4);
        assert.equal(allResourcesFromAlice.resources.length, 4);
        assert.equal(allResourcesFromBob.resources.length, 4);

        // Verify resource categories are discoverable
        const categories = allSpecsFromAlice.specifications.map(s => s.category);
        assert.includes(categories, TEST_CATEGORIES.SPACE);
        assert.includes(categories, TEST_CATEGORIES.TOOLS);
        assert.includes(categories, TEST_CATEGORIES.EQUIPMENT);

        console.log(`✅ Community resource discovery working - ${allSpecsFromAlice.specifications.length} specs, ${allResourcesFromAlice.resources.length} resources`);

        // Phase 6: Governance rule aggregation
        console.log("Phase 6: Governance rule ecosystem validation");
        
        const allRules = await getAllGovernanceRules(alice.cells[0]);
        const ruleTypes = allRules.rules.map(r => r.rule_type);
        
        // Should have governance rules from all specifications plus embedded ones
        assert.isAtLeast(allRules.rules.length, 6); // At least 6 rules from specifications
        
        assert.includes(ruleTypes, "access_hours");
        assert.includes(ruleTypes, "safety_certification");
        assert.includes(ruleTypes, "maintenance_protocol");
        assert.includes(ruleTypes, "material_usage");
        assert.includes(ruleTypes, "skill_requirement");

        console.log(`✅ Governance ecosystem established - ${allRules.rules.length} total rules`);

        // Phase 7: Resource contribution tracking
        console.log("Phase 7: Community contribution validation");
        
        const aliceContributions = await checkFirstResourceRequirement(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobContributions = await checkFirstResourceRequirement(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.isTrue(aliceContributions); // Alice created workshop resources
        assert.isTrue(bobContributions); // Bob created tech resources

        const aliceResourceCount = await getMyEconomicResources(alice.cells[0]);
        const bobResourceCount = await getMyEconomicResources(bob.cells[0]);

        assert.equal(aliceResourceCount.length, 2); // Space and tools
        assert.equal(bobResourceCount.length, 2); // 3D printing and electronics

        console.log(`✅ Both members have contributed resources to the community`);

        // Final verification: Complete ecosystem state
        console.log("Final verification: Community resource ecosystem");

        // Verify specification-resource relationships
        const spaceResources = await getResourcesBySpecification(alice.cells[0], spaceSpec.spec_hash);
        const printingResources = await getResourcesBySpecification(bob.cells[0], printingSpec.spec_hash);

        assert.equal(spaceResources.length, 1);
        assert.equal(printingResources.length, 1);

        // Verify all resources are active
        const activeResources = allResourcesFromAlice.resources.filter(
          r => r.state === RESOURCE_STATES.ACTIVE
        );
        assert.equal(activeResources.length, 4);

        console.log("✅ Community resource sharing workflow successful");
        console.log(`   - 4 resource specifications created by both members`);
        console.log(`   - 4 physical resources activated and available`);
        console.log(`   - ${allRules.rules.length} governance rules established`);
        console.log(`   - Cross-agent discovery and access working`);
        console.log(`   - Community contribution tracking functional`);
      }
    );
  },
  { timeout: 300000 }
);

test(
  "Resource custody and stewardship workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Complex custody transfers and stewardship patterns

        console.log("Setup: Resource stewardship ecosystem");

        // Phase 1: Alice creates high-value community resource
        console.log("Phase 1: Creating high-value community asset");
        
        const expensiveResourceSpec = await createResourceSpecification(
          alice.cells[0],
          sampleResourceSpecification({
            name: "Industrial CNC Machine",
            description: "High-precision CNC machine for advanced manufacturing",
            category: TEST_CATEGORIES.EQUIPMENT,
            tags: [TEST_TAGS.SHARED, TEST_TAGS.VERIFIED],
            governance_rules: [
              {
                rule_type: "operator_certification",
                rule_data: JSON.stringify({ 
                  certification_level: "advanced",
                  training_hours: 40,
                  supervision_required: true 
                }),
                enforced_by: "Manufacturing Steward",
              },
              {
                rule_type: "usage_tracking",
                rule_data: JSON.stringify({ 
                  log_all_usage: true,
                  project_approval_required: true,
                  material_costs_tracked: true 
                }),
                enforced_by: "Resource Coordinator",
              },
              {
                rule_type: "maintenance_intensive",
                rule_data: JSON.stringify({ 
                  daily_inspection: true,
                  professional_service_monthly: true,
                  downtime_scheduling: true 
                }),
                enforced_by: "Technical Steward",
              },
            ],
          })
        );

        const cncResource = await createEconomicResource(
          alice.cells[0],
          sampleEconomicResource(expensiveResourceSpec.spec_hash, {
            quantity: 1.0,
            unit: "machine",
            current_location: "Manufacturing Floor - Bay 3",
          })
        );

        console.log(`✅ Created high-value resource: ${expensiveResourceSpec.spec.name}`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 2: Specialized stewardship assignment
        console.log("Phase 2: Specialized stewardship assignment");
        
        // Alice transfers custody to Bob (specialized operator)
        const initialTransfer = await transferCustody(
          alice.cells[0],
          {
            resource_hash: cncResource.resource_hash,
            new_custodian: bob.agentPubKey,
          }
        );

        assert.equal(initialTransfer.updated_resource.custodian.toString(), bob.agentPubKey.toString());

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify custody change
        const aliceResourcesAfterTransfer = await getMyEconomicResources(alice.cells[0]);
        const bobResourcesAfterTransfer = await getMyEconomicResources(bob.cells[0]);

        assert.equal(aliceResourcesAfterTransfer.length, 0);
        assert.equal(bobResourcesAfterTransfer.length, 1);

        console.log(`✅ Specialized steward (Bob) now has custody`);

        // Phase 3: Resource activation under stewardship
        console.log("Phase 3: Resource activation under stewardship");
        
        const activationResult = await updateResourceState(
          bob.cells[0],
          {
            resource_hash: initialTransfer.updated_resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }
        );

        assert.ok(activationResult);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify resource is active and visible to community
        const communityView = await getAllEconomicResources(alice.cells[0]);
        const activeCNC = communityView.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(activeCNC);
        assert.equal(activeCNC!.state, RESOURCE_STATES.ACTIVE);
        assert.equal(activeCNC!.custodian.toString(), bob.agentPubKey.toString());

        console.log(`✅ Resource active under stewardship - visible to community`);

        // Phase 4: Maintenance cycle management
        console.log("Phase 4: Steward-managed maintenance cycle");
        
        // Bob performs scheduled maintenance
        const maintenanceStart = await updateResourceState(
          bob.cells[0],
          {
            resource_hash: activationResult.signed_action.hashed.hash,
            new_state: RESOURCE_STATES.MAINTENANCE,
          }
        );

        assert.ok(maintenanceStart);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify maintenance state is communicated
        const maintenanceView = await getAllEconomicResources(alice.cells[0]);
        const maintenanceCNC = maintenanceView.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(maintenanceCNC);
        assert.equal(maintenanceCNC!.state, RESOURCE_STATES.MAINTENANCE);

        console.log(`✅ Resource in maintenance - community informed`);

        // Complete maintenance and return to active
        const maintenanceComplete = await updateResourceState(
          bob.cells[0],
          {
            resource_hash: maintenanceStart.signed_action.hashed.hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        console.log(`✅ Maintenance completed - resource available again`);

        // Phase 5: Temporary custody for specific project
        console.log("Phase 5: Temporary custody transfer for project");
        
        // Bob transfers back to Alice for a specific project
        const projectTransfer = await transferCustody(
          bob.cells[0],
          {
            resource_hash: maintenanceComplete.signed_action.hashed.hash,
            new_custodian: alice.agentPubKey,
          }
        );

        assert.equal(projectTransfer.updated_resource.custodian.toString(), alice.agentPubKey.toString());

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify temporary custody transfer
        const aliceResourcesForProject = await getMyEconomicResources(alice.cells[0]);
        const bobResourcesAfterProject = await getMyEconomicResources(bob.cells[0]);

        assert.equal(aliceResourcesForProject.length, 1);
        assert.equal(bobResourcesAfterProject.length, 0);

        console.log(`✅ Temporary project custody established`);

        // Phase 6: Return to permanent steward
        console.log("Phase 6: Return to permanent steward");
        
        // Alice returns custody to Bob after project completion
        const returnTransfer = await transferCustody(
          alice.cells[0],
          {
            resource_hash: projectTransfer.updated_resource_hash,
            new_custodian: bob.agentPubKey,
          }
        );

        assert.equal(returnTransfer.updated_resource.custodian.toString(), bob.agentPubKey.toString());

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify return to permanent steward
        const finalAliceResources = await getMyEconomicResources(alice.cells[0]);
        const finalBobResources = await getMyEconomicResources(bob.cells[0]);

        assert.equal(finalAliceResources.length, 0);
        assert.equal(finalBobResources.length, 1);

        console.log(`✅ Custody returned to permanent steward`);

        // Final verification: Complete stewardship tracking
        console.log("Final verification: Stewardship continuity");

        // Verify resource history and current state
        const finalCommunityView = await getAllEconomicResources(alice.cells[0]);
        const finalCNC = finalCommunityView.resources.find(
          r => r.created_by.toString() === alice.agentPubKey.toString()
        );

        assert.ok(finalCNC);
        assert.equal(finalCNC!.state, RESOURCE_STATES.ACTIVE);
        assert.equal(finalCNC!.custodian.toString(), bob.agentPubKey.toString());
        assert.equal(finalCNC!.created_by.toString(), alice.agentPubKey.toString());

        // Verify governance rules are still effective
        const finalSpecWithRules = await getResourceSpecificationWithRules(
          alice.cells[0],
          expensiveResourceSpec.spec_hash
        );
        assert.equal(finalSpecWithRules.governance_rules.length, 3);

        // Verify contribution tracking
        const aliceStillContributor = await checkFirstResourceRequirement(
          bob.cells[0],
          alice.agentPubKey
        );
        assert.isTrue(aliceStillContributor); // Alice remains the contributor

        console.log("✅ Resource custody and stewardship workflow successful"); 
        console.log(`   - High-value resource created by contributor`);
        console.log(`   - Specialized steward assigned and functional`);
        console.log(`   - Maintenance cycles managed by steward`);
        console.log(`   - Temporary custody transfers working`);
        console.log(`   - Stewardship continuity maintained`);
        console.log(`   - Community visibility and governance preserved`);
      }
    );
  },
  { timeout: 300000 }
);

test(
  "Multi-agent resource ecosystem and discovery workflow",
  async () => {
    await runScenarioWithTwoAgents(
      async (_scenario: Scenario, alice: PlayerApp, bob: PlayerApp) => {
        // Scenario: Complex multi-agent resource ecosystem with discovery patterns

        console.log("Setup: Multi-agent resource ecosystem");

        // Phase 1: Diverse resource creation by both agents
        console.log("Phase 1: Creating diverse resource ecosystem");
        
        const resourceCreations = await Promise.all([
          // Alice creates knowledge resources
          createResourceSpecification(
            alice.cells[0],
            sampleResourceSpecification({
              name: "Permaculture Design Course",
              description: "Comprehensive permaculture design training program",
              category: TEST_CATEGORIES.KNOWLEDGE,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY],
              governance_rules: [
                {
                  rule_type: "participation_requirement",
                  rule_data: JSON.stringify({ 
                    commitment_hours: 72,
                    field_work_required: true 
                  }),
                  enforced_by: "Course Coordinator",
                },
              ],
            })
          ),
          createResourceSpecification(
            alice.cells[0],
            sampleResourceSpecification({
              name: "Community Kitchen",
              description: "Shared commercial kitchen for food processing",
              category: TEST_CATEGORIES.SPACE,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.VERIFIED],
              governance_rules: [
                {
                  rule_type: "food_safety",
                  rule_data: JSON.stringify({ 
                    certification_required: true,
                    cleaning_protocols: "strict" 
                  }),
                  enforced_by: "Food Safety Coordinator",
                },
              ],
            })
          ),
          // Bob creates service resources
          createResourceSpecification(
            bob.cells[0],
            sampleResourceSpecification({
              name: "Web Development Services",
              description: "Custom web development for community projects",
              category: TEST_CATEGORIES.SERVICE,
              tags: [TEST_TAGS.COMMUNITY, TEST_TAGS.VERIFIED],
              governance_rules: [
                {
                  rule_type: "project_scope",
                  rule_data: JSON.stringify({ 
                    community_projects_priority: true,
                    max_project_duration_months: 6 
                  }),
                  enforced_by: "Tech Coordinator",
                },
              ],
            })
          ),
          createResourceSpecification(
            bob.cells[0],
            sampleResourceSpecification({
              name: "Delivery Van Fleet",
              description: "Electric delivery vans for community logistics",
              category: TEST_CATEGORIES.EQUIPMENT,
              tags: [TEST_TAGS.SHARED, TEST_TAGS.COMMUNITY],
              governance_rules: [
                {
                  rule_type: "driver_requirements",
                  rule_data: JSON.stringify({ 
                    commercial_license: true,
                    eco_driving_training: true 
                  }),
                  enforced_by: "Fleet Manager",
                },
              ],
            })
          ),
        ]);

        const [courseSpec, kitchenSpec, webDevSpec, vanFleetSpec] = resourceCreations;

        console.log(`✅ Created diverse resource specifications across categories`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 2: Create economic resources with varied quantities and states
        console.log("Phase 2: Creating varied economic resources");
        
        const economicResources = await Promise.all([
          createEconomicResource(
            alice.cells[0],
            sampleEconomicResource(courseSpec.spec_hash, {
              quantity: 4.0,
              unit: "sessions",
              current_location: "Community Center - Room 201",
            })
          ),
          createEconomicResource(
            alice.cells[0],
            sampleEconomicResource(kitchenSpec.spec_hash, {
              quantity: 1.0,
              unit: "kitchen",
              current_location: "Building B - Ground Floor",
            })
          ),
          createEconomicResource(
            bob.cells[0],
            sampleEconomicResource(webDevSpec.spec_hash, {
              quantity: 100.0,
              unit: "hours",
              current_location: "Remote/Distributed",
            })
          ),
          createEconomicResource(
            bob.cells[0],
            sampleEconomicResource(vanFleetSpec.spec_hash, {
              quantity: 3.0,
              unit: "vehicles",
              current_location: "Community Garage - Bays 1-3",
            })
          ),
        ]);

        const [courseResource, kitchenResource, webDevResource, vanResource] = economicResources;

        console.log(`✅ Created ${economicResources.length} economic resources with varied quantities`);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Phase 3: Mixed resource state management
        console.log("Phase 3: Mixed resource state management");
        
        // Activate some resources, keep others in different states
        await Promise.all([
          updateResourceState(alice.cells[0], {
            resource_hash: courseResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }),
          updateResourceState(alice.cells[0], {
            resource_hash: kitchenResource.resource_hash,
            new_state: RESOURCE_STATES.MAINTENANCE, // Kitchen under renovation
          }),
          updateResourceState(bob.cells[0], {
            resource_hash: webDevResource.resource_hash,
            new_state: RESOURCE_STATES.ACTIVE,
          }),
          updateResourceState(bob.cells[0], {
            resource_hash: vanResource.resource_hash,
            new_state: RESOURCE_STATES.RESERVED, // Vans reserved for special project
          }),
        ]);

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        console.log(`✅ Resources in varied states - some active, some in maintenance/reserved`);

        // Phase 4: Comprehensive discovery testing
        console.log("Phase 4: Comprehensive resource discovery");
        
        const allSpecsFromAlice = await getAllResourceSpecifications(alice.cells[0]);
        const allSpecsFromBob = await getAllResourceSpecifications(bob.cells[0]);
        const allResourcesFromAlice = await getAllEconomicResources(alice.cells[0]);
        const allResourcesFromBob = await getAllEconomicResources(bob.cells[0]);

        // Both agents should see all resources
        assert.equal(allSpecsFromAlice.specifications.length, 4);
        assert.equal(allSpecsFromBob.specifications.length, 4);
        assert.equal(allResourcesFromAlice.resources.length, 4);
        assert.equal(allResourcesFromBob.resources.length, 4);

        // Verify category diversity
        const categories = [...new Set(allSpecsFromAlice.specifications.map(s => s.category))];
        assert.equal(categories.length, 4); // All different categories

        assert.includes(categories, TEST_CATEGORIES.KNOWLEDGE);
        assert.includes(categories, TEST_CATEGORIES.SPACE);
        assert.includes(categories, TEST_CATEGORIES.SERVICE);
        assert.includes(categories, TEST_CATEGORIES.EQUIPMENT);

        // Verify state diversity
        const states = [...new Set(allResourcesFromAlice.resources.map(r => r.state))];
        assert.isAtLeast(states.length, 3); // At least 3 different states

        console.log(`✅ Discovery working - ${categories.length} categories, ${states.length} states`);

        // Phase 5: Cross-agent custody patterns
        console.log("Phase 5: Cross-agent custody and collaboration");
        
        // Alice transfers course resource to Bob for technical platform management
        const courseTransfer = await transferCustody(
          alice.cells[0],
          {
            resource_hash: courseResource.resource_hash,
            new_custodian: bob.agentPubKey,
          }
        );

        // Bob transfers web dev services to Alice for community project coordination
        const webDevTransfer = await transferCustody(
          bob.cells[0],
          {
            resource_hash: webDevResource.resource_hash,
            new_custodian: alice.agentPubKey,
          }
        );

        await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

        // Verify cross-custody
        const aliceResourcesAfterSwap = await getMyEconomicResources(alice.cells[0]);
        const bobResourcesAfterSwap = await getMyEconomicResources(bob.cells[0]);

        // Each should still have 2 resources, but different ones
        assert.equal(aliceResourcesAfterSwap.length, 2);
        assert.equal(bobResourcesAfterSwap.length, 2);

        console.log(`✅ Cross-agent custody transfers successful`);

        // Phase 6: Specification-resource relationship validation
        console.log("Phase 6: Specification-resource relationship validation");
        
        // Test resource queries by specification
        const courseResources = await getResourcesBySpecification(
          bob.cells[0], // Bob querying
          courseSpec.spec_hash
        );
        const webDevResources = await getResourcesBySpecification(
          alice.cells[0], // Alice querying
          webDevSpec.spec_hash
        );

        assert.equal(courseResources.length, 1);
        assert.equal(webDevResources.length, 1);

        // Test specification governance rule access
        const courseSpecWithRules = await getResourceSpecificationWithRules(
          bob.cells[0],
          courseSpec.spec_hash
        );
        const webDevSpecWithRules = await getResourceSpecificationWithRules(
          alice.cells[0],
          webDevSpec.spec_hash
        );

        assert.equal(courseSpecWithRules.governance_rules.length, 1);
        assert.equal(webDevSpecWithRules.governance_rules.length, 1);

        console.log(`✅ Specification-resource relationships intact across agents`);

        // Phase 7: Community contribution validation
        console.log("Phase 7: Community contribution and impact assessment");
        
        const aliceContribution = await checkFirstResourceRequirement(
          bob.cells[0],
          alice.agentPubKey
        );
        const bobContribution = await checkFirstResourceRequirement(
          alice.cells[0],
          bob.agentPubKey
        );

        assert.isTrue(aliceContribution);
        assert.isTrue(bobContribution);

        // Verify total community resource count
        const totalCommunitySpecs = await getAllResourceSpecifications(alice.cells[0]);
        const totalCommunityResources = await getAllEconomicResources(alice.cells[0]);

        assert.equal(totalCommunitySpecs.specifications.length, 4);
        assert.equal(totalCommunityResources.resources.length, 4);

        // Verify governance rule ecosystem
        const allGovernanceRules = await getAllGovernanceRules(alice.cells[0]);
        assert.isAtLeast(allGovernanceRules.rules.length, 4); // At least one per spec

        console.log(`✅ Community contribution tracking and impact assessment complete`);

        // Final verification: Complete ecosystem health
        console.log("Final verification: Multi-agent ecosystem health");

        // Verify resource state distribution
        const activeResources = totalCommunityResources.resources.filter(
          r => r.state === RESOURCE_STATES.ACTIVE
        ).length;
        const nonActiveResources = totalCommunityResources.resources.filter(
          r => r.state !== RESOURCE_STATES.ACTIVE
        ).length;

        assert.isAtLeast(activeResources, 2);
        assert.isAtLeast(nonActiveResources, 2);

        // Verify cross-agent visibility consistency
        const aliceFinalView = await getAllEconomicResources(alice.cells[0]);
        const bobFinalView = await getAllEconomicResources(bob.cells[0]);

        assert.equal(aliceFinalView.resources.length, bobFinalView.resources.length);

        // Verify custodianship distribution
        const aliceCustody = aliceFinalView.resources.filter(
          r => r.custodian.toString() === alice.agentPubKey.toString()
        ).length;
        const bobCustody = aliceFinalView.resources.filter(
          r => r.custodian.toString() === bob.agentPubKey.toString()
        ).length;

        assert.equal(aliceCustody, 2);
        assert.equal(bobCustody, 2);

        console.log("✅ Multi-agent resource ecosystem workflow successful");
        console.log(`   - 4 diverse resource specifications created`);
        console.log(`   - ${categories.length} different resource categories represented`);
        console.log(`   - ${activeResources} active resources, ${nonActiveResources} in other states`);
        console.log(`   - Cross-agent custody transfers functional`);
        console.log(`   - Resource discovery and relationship queries working`);
        console.log(`   - ${allGovernanceRules.rules.length} total governance rules in ecosystem`);
        console.log(`   - Community contribution tracking accurate`);
      }
    );
  },
  { timeout: 300000 }
);
import { test, expect } from "vitest";
import { runScenario, pause, CallableCell } from "@holochain/tryorama";
import { Record, ActionHash, AgentPubKey } from "@holochain/client";

// Test PPR Integration with Economic Processes
// This test suite covers PPR integration with economic events, commitments, and agent promotion

test('PPR Integration: Automatic PPR generation on economic events', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: './workdir/nondominium.happ' } },
      { appBundleSource: { path: './workdir/nondominium.happ' } }
    ]);

    await scenario.shareAllAgents();

    const alice_cell = alice.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;
    
    // Create a commitment
    const commitment = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_commitment',
      payload: {
        action: 'Transfer',
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: null,
        resource_conforms_to: null,
        input_of: null,
        due_date: Date.now() * 1000 + (24 * 60 * 60 * 1000000),
        note: 'Test commitment for automatic PPR generation',
        committed_at: Date.now() * 1000
      }
    });

    // Log economic event with automatic PPR generation enabled
    const event_result = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'log_economic_event',
      payload: {
        action: 'Transfer',
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.signed_action.hashed.hash,
        resource_quantity: 1.0,
        note: 'Test transfer with automatic PPR generation',
        commitment_hash: commitment.signed_action.hashed.hash,
        generate_pprs: true  // Enable automatic PPR generation
      }
    });

    // Verify event was created
    expect(event_result).toHaveProperty('event_hash');
    expect(event_result).toHaveProperty('event');
    expect(event_result).toHaveProperty('ppr_claims');

    // Verify PPR claims were automatically generated
    expect(event_result.ppr_claims).toBeDefined();
    expect(event_result.ppr_claims).toHaveProperty('provider_claim_hash');
    expect(event_result.ppr_claims).toHaveProperty('receiver_claim_hash');
    expect(event_result.ppr_claims).toHaveProperty('provider_claim');
    expect(event_result.ppr_claims).toHaveProperty('receiver_claim');

    // Verify claim types are appropriate for Transfer action
    expect(event_result.ppr_claims.provider_claim.claim_type).toBe('CustodyTransfer');
    expect(event_result.ppr_claims.receiver_claim.claim_type).toBe('CustodyAcceptance');

    // Verify both claims reference the correct economic event and commitment
    expect(event_result.ppr_claims.provider_claim.fulfilled_by).toEqual(event_result.event_hash);
    expect(event_result.ppr_claims.receiver_claim.fulfilled_by).toEqual(event_result.event_hash);
    expect(event_result.ppr_claims.provider_claim.fulfills).toEqual(commitment.signed_action.hashed.hash);
    expect(event_result.ppr_claims.receiver_claim.fulfills).toEqual(commitment.signed_action.hashed.hash);

    console.log('✅ Successfully generated PPRs automatically on economic event');
  });
});

test('PPR Integration: Initial transfer with agent promotion tracking', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: './workdir/nondominium.happ' } },
      { appBundleSource: { path: './workdir/nondominium.happ' } }
    ]);

    await scenario.shareAllAgents();

    const alice_cell = alice.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;
    const bob_cell = bob.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;
    
    // Create a mock resource for the initial transfer
    const mock_resource_hash = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_commitment', // Using commitment hash as mock resource
      payload: {
        action: 'Produce',
        provider: alice.agentPubKey,
        receiver: alice.agentPubKey,
        resource_inventoried_as: null,
        resource_conforms_to: null,
        input_of: null,
        due_date: Date.now() * 1000 + (24 * 60 * 60 * 1000000),
        note: 'Mock resource for initial transfer',
        committed_at: Date.now() * 1000
      }
    });

    // Log initial transfer (typical first transaction by a Simple Agent)
    const initial_transfer = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'log_initial_transfer',
      payload: {
        resource_hash: mock_resource_hash.signed_action.hashed.hash,
        receiver: bob.agentPubKey,
        quantity: 1.0
      }
    });

    // Verify initial transfer event was created
    expect(initial_transfer).toHaveProperty('event_hash');
    expect(initial_transfer).toHaveProperty('event');
    expect(initial_transfer).toHaveProperty('ppr_claims');

    // Verify event properties
    expect(initial_transfer.event.action).toBe('InitialTransfer');
    expect(initial_transfer.event.provider).toEqual(alice.agentPubKey);
    expect(initial_transfer.event.receiver).toEqual(bob.agentPubKey);

    // Verify PPR claims were generated for agent promotion tracking
    expect(initial_transfer.ppr_claims).toBeDefined();
    expect(initial_transfer.ppr_claims.provider_claim.claim_type).toBe('CustodyTransfer');
    expect(initial_transfer.ppr_claims.receiver_claim.claim_type).toBe('CustodyAcceptance');

    // Verify the notes indicate this is for Simple Agent promotion
    expect(initial_transfer.event.note).toContain('Simple Agent');

    console.log('✅ Successfully tracked initial transfer with PPR generation for agent promotion');

    // Now test retrieving claims for reputation-based promotion
    const alice_claims = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_my_participation_claims',
      payload: {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null
      }
    });

    expect(alice_claims.claims).toHaveLength(1); // Alice should have the provider claim
    expect(alice_claims.claims[0][1].claim_type).toBe('CustodyTransfer');

    // Derive reputation summary for promotion eligibility
    const reputation = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'derive_reputation_summary',
      payload: {
        period_start: Date.now() * 1000 - (24 * 60 * 60 * 1000000), // 24 hours ago
        period_end: Date.now() * 1000 + (24 * 60 * 60 * 1000000),   // 24 hours from now
        claim_type_filter: null
      }
    });

    expect(reputation.summary.total_claims).toBeGreaterThan(0);
    expect(reputation.summary.custody_claims).toBeGreaterThan(0);
    expect(reputation.summary.agent).toEqual(alice.agentPubKey);

    console.log('✅ Successfully generated reputation summary for agent promotion eligibility');
  });
});

test('PPR Integration: Agent promotion with validation PPRs', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: './workdir/nondominium.happ' } },
      { appBundleSource: { path: './workdir/nondominium.happ' } }
    ]);

    await scenario.shareAllAgents();

    const alice_cell = alice.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;
    const bob_cell = bob.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;

    // First, create person profiles for both agents
    await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_person',
      fn_name: 'create_person',
      payload: {
        name: 'Alice',
        avatar_url: null,
        bio: 'Test agent for promotion'
      }
    });

    await bob.callZome({
      cell_id: bob_cell,
      zome_name: 'zome_person',
      fn_name: 'create_person',
      payload: {
        name: 'Bob',
        avatar_url: null,
        bio: 'Validator agent'
      }
    });

    // Create a mock first resource for Alice
    const first_resource = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_commitment',
      payload: {
        action: 'Produce',
        provider: alice.agentPubKey,
        receiver: alice.agentPubKey,
        resource_inventoried_as: null,
        resource_conforms_to: null,
        input_of: null,
        due_date: Date.now() * 1000 + (24 * 60 * 60 * 1000000),
        note: 'First resource for agent promotion',
        committed_at: Date.now() * 1000
      }
    });

    // Bob promotes Alice from Simple Agent to Accountable Agent
    const promotion_result = await bob.callZome({
      cell_id: bob_cell,
      zome_name: 'zome_person',
      fn_name: 'promote_agent_to_accountable',
      payload: {
        agent: alice.agentPubKey,
        first_resource_hash: first_resource.signed_action.hashed.hash
      }
    });

    expect(promotion_result).toContain('successfully promoted');
    console.log('✅ Agent promotion completed:', promotion_result);

    // Verify that validation PPRs were generated during the promotion process
    // Check Bob's claims (validator)
    const bob_claims = await bob.callZome({
      cell_id: bob_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_my_participation_claims',
      payload: {
        claim_type_filter: 'ResourceValidation',
        from_time: null,
        to_time: null,
        limit: null
      }
    });

    expect(bob_claims.claims.length).toBeGreaterThan(0);
    expect(bob_claims.claims[0][1].claim_type).toBe('ResourceValidation');
    console.log('✅ Validator received ResourceValidation PPR claim');

    // Check Alice's claims (promoted agent)
    const alice_claims = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_my_participation_claims',
      payload: {
        claim_type_filter: 'RuleCompliance',
        from_time: null,
        to_time: null,
        limit: null
      }
    });

    expect(alice_claims.claims.length).toBeGreaterThan(0);
    expect(alice_claims.claims[0][1].claim_type).toBe('RuleCompliance');
    console.log('✅ Promoted agent received RuleCompliance PPR claim');

    // Verify both claims are linked to the same validation process
    const bob_claim = bob_claims.claims[0][1];
    const alice_claim = alice_claims.claims[0][1];
    
    expect(bob_claim.fulfills).toEqual(alice_claim.fulfills); // Same validation event
    expect(bob_claim.counterparty).toEqual(alice.agentPubKey);
    expect(alice_claim.counterparty).toEqual(bob.agentPubKey);

    console.log('✅ Agent promotion validation PPRs correctly linked and validated');
  });
});

test('PPR Integration: Service commitment and fulfillment PPRs', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: './workdir/nondominium.happ' } },
      { appBundleSource: { path: './workdir/nondominium.happ' } }
    ]);

    await scenario.shareAllAgents();

    const alice_cell = alice.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;
    
    // Create a commitment for maintenance service
    const service_commitment = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_commitment',
      payload: {
        action: 'Work',
        provider: bob.agentPubKey,     // Bob provides maintenance service
        receiver: alice.agentPubKey,  // Alice receives service
        resource_inventoried_as: null,
        resource_conforms_to: null,
        input_of: null,
        due_date: Date.now() * 1000 + (24 * 60 * 60 * 1000000),
        note: 'Maintenance service commitment',
        committed_at: Date.now() * 1000
      }
    });

    // Generate PPRs for service commitment acceptance
    const commitment_pprs = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_service_commitment_pprs',
      payload: {
        commitment_hash: service_commitment.signed_action.hashed.hash,
        service_type: 'maintenance',
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        resource_hash: null
      }
    });

    expect(commitment_pprs).toHaveProperty('provider_claim');
    expect(commitment_pprs).toHaveProperty('receiver_claim');
    expect(commitment_pprs.provider_claim.claim_type).toBe('MaintenanceCommitmentAccepted');
    expect(commitment_pprs.receiver_claim.claim_type).toBe('GoodFaithTransfer');

    console.log('✅ Generated service commitment PPRs');

    // Create economic event for service fulfillment
    const fulfillment_event = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'log_economic_event',
      payload: {
        action: 'Work',
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        resource_inventoried_as: service_commitment.signed_action.hashed.hash,
        resource_quantity: 1.0,
        note: 'Maintenance service completed',
        commitment_hash: service_commitment.signed_action.hashed.hash,
        generate_pprs: false // We'll generate fulfillment PPRs separately
      }
    });

    // Generate PPRs for service fulfillment
    const fulfillment_pprs = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_service_fulfillment_pprs',
      payload: {
        commitment_hash: service_commitment.signed_action.hashed.hash,
        event_hash: fulfillment_event.event_hash,
        service_type: 'maintenance',
        provider: bob.agentPubKey,
        receiver: alice.agentPubKey,
        resource_hash: null
      }
    });

    expect(fulfillment_pprs).toHaveProperty('provider_claim');
    expect(fulfillment_pprs).toHaveProperty('receiver_claim');
    expect(fulfillment_pprs.provider_claim.claim_type).toBe('MaintenanceFulfillmentCompleted');
    expect(fulfillment_pprs.receiver_claim.claim_type).toBe('CustodyAcceptance');

    console.log('✅ Generated service fulfillment PPRs');

    // Verify complete service cycle creates 4 PPRs total
    const bob_claims = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_my_participation_claims',
      payload: {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null
      }
    });

    // Alice should have received 2 claims: GoodFaithTransfer + CustodyAcceptance
    const alice_service_claims = bob_claims.claims.filter(claim => 
      claim[1].claim_type === 'GoodFaithTransfer' || 
      claim[1].claim_type === 'CustodyAcceptance'
    );
    
    expect(alice_service_claims).toHaveLength(2);
    console.log('✅ Complete service cycle generated appropriate PPRs for all participants');
  });
});

test('PPR Integration: Cross-component data consistency', async () => {
  await runScenario(async scenario => {
    const { alice, bob } = await scenario.addPlayersWithApps([
      { appBundleSource: { path: './workdir/nondominium.happ' } },
      { appBundleSource: { path: './workdir/nondominium.happ' } }
    ]);

    await scenario.shareAllAgents();

    const alice_cell = alice.cells.find(cell => cell.cell_id[0].toString() === 'nondominium')!.cell_id;
    
    // Create a commitment
    const commitment = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'create_commitment',
      payload: {
        action: 'Transfer',
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: null,
        resource_conforms_to: null,
        input_of: null,
        due_date: Date.now() * 1000 + (24 * 60 * 60 * 1000000),
        note: 'Test commitment for consistency check',
        committed_at: Date.now() * 1000
      }
    });

    // Create economic event with PPR generation
    const event_result = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'log_economic_event',
      payload: {
        action: 'Transfer',
        provider: alice.agentPubKey,
        receiver: bob.agentPubKey,
        resource_inventoried_as: commitment.signed_action.hashed.hash,
        resource_quantity: 1.0,
        note: 'Test event for consistency check',
        commitment_hash: commitment.signed_action.hashed.hash,
        generate_pprs: true
      }
    });

    // Verify links exist from event to PPR claims
    const event_to_ppr_links = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_links',
      payload: {
        base: event_result.event_hash,
        link_type: 'EventToPrivateParticipationClaims'
      }
    });

    expect(event_to_ppr_links.length).toBe(2); // Should link to both PPR claims
    console.log('✅ Event correctly linked to PPR claims');

    // Verify links exist from commitment to PPR claims
    const commitment_to_ppr_links = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_links',
      payload: {
        base: commitment.signed_action.hashed.hash,
        link_type: 'CommitmentToPrivateParticipationClaims'
      }
    });

    expect(commitment_to_ppr_links.length).toBe(2); // Should link to both PPR claims
    console.log('✅ Commitment correctly linked to PPR claims');

    // Verify agent links to their PPR claims
    const alice_ppr_links = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_links',
      payload: {
        base: alice.agentPubKey,
        link_type: 'AgentToPrivateParticipationClaims'
      }
    });

    expect(alice_ppr_links.length).toBeGreaterThan(0); // Alice should have at least one PPR claim
    console.log('✅ Agent correctly linked to their PPR claims');

    // Test data consistency by retrieving the same claim through different paths
    const alice_claims = await alice.callZome({
      cell_id: alice_cell,
      zome_name: 'zome_gouvernance',
      fn_name: 'get_my_participation_claims',
      payload: {
        claim_type_filter: null,
        from_time: null,
        to_time: null,
        limit: null
      }
    });

    expect(alice_claims.claims.length).toBeGreaterThan(0);
    
    // Verify claim data consistency
    const sample_claim = alice_claims.claims[0][1];
    expect(sample_claim.fulfills).toEqual(commitment.signed_action.hashed.hash);
    expect(sample_claim.fulfilled_by).toEqual(event_result.event_hash);
    expect(sample_claim.counterparty).toEqual(bob.agentPubKey);

    console.log('✅ Cross-component data consistency verified');
  });
});
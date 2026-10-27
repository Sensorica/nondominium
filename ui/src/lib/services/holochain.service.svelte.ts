import { type AgentPubKey, type AppInfoResponse, type CellId, type ClonedCell, AppWebsocket } from '@holochain/client';
import { Context, Layer } from 'effect';
import {
  authorizeCellSigning,
  connectHolochainClient,
  type HolochainConnectionMode
} from '$lib/utils/hc-connect';
import type { NdoDnaProperties } from '@nondominium/shared-types';
import { getNdoCellByDnaHash } from './ndo-clone.helpers';

export type ZomeName = 'zome_person' | 'zome_resource' | 'zome_gouvernance' | 'zome_group';
// group_${string} removed: group cells are now addressed by CellId, not role-name strings.
export type RoleName = 'nondominium' | 'lobby';

export interface HolochainClientService {
  readonly appId: string;
  readonly client: AppWebsocket | null;
  readonly isConnected: boolean;
  readonly connectionUrl: string | null;
  readonly connectionMode: HolochainConnectionMode | null;

  connectClient(): Promise<void>;

  getAppInfo(): Promise<AppInfoResponse>;

  getMyAgentPubKey(): Promise<AgentPubKey>;

  callZome(
    zomeName: ZomeName,
    fnName: string,
    payload: unknown,
    capSecret?: Uint8Array | undefined,
    roleName?: RoleName,
    cellId?: CellId
  ): Promise<unknown>;

  verifyConnection(): Promise<boolean>;

  createGroupCloneCell(networkSeed: string): Promise<ClonedCell>;

  enableGroupCloneCell(dnaHash: Uint8Array): Promise<ClonedCell>;

  /**
   * Provisions a per-NDO `ndo` clone cell (ADR-010 model A). `properties` carries
   * the immutable Layer 0 fields so the DnaHash is cryptographically bound to the
   * NDO identity. Pass `properties` as a PLAIN JS OBJECT — the conductor
   * canonicalizes it to SerializedBytes; pre-encoded bytes throw (probe-120).
   */
  createNdoCloneCell(args: {
    networkSeed: string;
    properties: NdoDnaProperties;
  }): Promise<ClonedCell>;

  /**
   * Resolves the ndo clone cell for an NDO DnaHash. If it exists, enables it (if
   * disabled) and authorizes signing; otherwise creates it from `coordinates`.
   * Used by the read path — a peer opening an NDO anchored by another agent.
   */
  ensureNdoCloneCell: (
    dnaHash: Uint8Array,
    coordinates?: { networkSeed: string; properties: NdoDnaProperties }
  ) => Promise<CellId>;
}

/**
 * Creates a Holochain client service that manages the connection to the Holochain conductor
 * and provides methods to interact with it.
 *
 * @returns An object with methods to interact with the Holochain conductor
 */
function createHolochainClientService(): HolochainClientService {
  // State
  const appId: string = 'nondominium';
  let client: AppWebsocket | null = $state(null);
  let isConnected: boolean = $state(false);
  let connectionUrl: string | null = $state(null);
  let connectionMode: HolochainConnectionMode | null = $state(null);
  // Admin URL retained so runtime-created group clone cells can have signing
  // credentials authorized (provisioned cells are authorized at connect time).
  let adminWsUrl: string | null = null;
  // Guards against concurrent connects (remount, Retry-while-connecting, HMR),
  // which would each authorize signing credentials and race the source chain.
  let connectInFlight: Promise<void> | null = null;

  /**
   * Connects the client to the Host backend with retry logic.
   * Reentrant calls share the same in-flight promise instead of racing.
   */
  async function connectClient(): Promise<void> {
    if (isConnected && client) return;
    if (connectInFlight) return connectInFlight;

    connectInFlight = (async () => {
      isConnected = false;
      client = null;
      connectionUrl = null;
      connectionMode = null;
      adminWsUrl = null;

      try {
        console.log('Attempting to connect to Holochain conductor...');
        const result = await connectHolochainClient(appId);
        client = result.client;
        connectionUrl = result.connectionUrl;
        connectionMode = result.connectionMode;
        adminWsUrl = result.adminWsUrl ?? null;
        isConnected = true;
        console.log(
          `✅ Connected to Holochain (${result.connectionMode}) at ${result.connectionUrl}`
        );
      } catch (error) {
        console.warn('❌ Connection failed:', error);
        isConnected = false;
        client = null;
        connectionUrl = null;
        connectionMode = null;
        throw error;
      } finally {
        connectInFlight = null;
      }
    })();

    return connectInFlight;
  }

  /**
   * Retrieves application information from the Holochain client.
   * @returns {Promise<AppInfoResponse>} - The application information.
   */
  async function getAppInfo(): Promise<AppInfoResponse> {
    if (!client) {
      throw new Error('Client not connected');
    }
    return await client.appInfo();
  }

  /**
   * Returns the calling agent's own public key from the conductor's AppInfo.
   * Preferred over reading it from a Person entry (which does not serialize this field).
   */
  async function getMyAgentPubKey(): Promise<AgentPubKey> {
    const info = await getAppInfo();
    if (!info) throw new Error('App info not available');
    return info.agent_pub_key;
  }

  /**
   * Verifies if the client is truly connected and working
   */
  async function verifyConnection(): Promise<boolean> {
    if (!client || !isConnected) {
      return false;
    }

    try {
      // Try to get app info as a connectivity test
      await client.appInfo();
      return true;
    } catch (error) {
      console.warn('Connection verification failed:', error);
      isConnected = false;
      client = null;
      return false;
    }
  }

  async function callZome(
    zomeName: ZomeName,
    fnName: string,
    payload: unknown,
    capSecret: Uint8Array | undefined = undefined,
    roleName: RoleName = 'nondominium',
    cellId?: CellId
  ): Promise<unknown> {
    if (!client) {
      throw new Error('Client not connected');
    }

    const baseRequest = {
      cap_secret: capSecret,
      zome_name: zomeName,
      fn_name: fnName,
      payload
    };

    try {
      // When a CellId is provided (e.g., group cloned cells), address the cell directly.
      // Otherwise use the role name (standard cells: nondominium, lobby).
      const request = cellId
        ? { ...baseRequest, cell_id: cellId }
        : { ...baseRequest, role_name: roleName };
      return await client.callZome(request);
    } catch (error) {
      console.error(`Error calling zome function ${zomeName}.${fnName}:`, error);

      // Check if this is a connection error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('WebSocket') || errorMessage.includes('connection')) {
        console.warn('Detected connection error, marking as disconnected');
        isConnected = false;
        client = null;
      }

      throw error;
    }
  }

  /**
   * Drops the AppWebsocket's memoized AppInfo so the next appInfo() call reflects
   * a just-changed cell topology (clone created/enabled). Called at the write
   * boundary so every read path — getAppInfo, enumerateGroupCells,
   * getGroupCellHandleBySeed — sees the new cell without each having to poke the
   * private cache field itself.
   */
  function invalidateAppInfoCache(): void {
    if (client) client.cachedAppInfo = undefined;
  }

  async function enableGroupCloneCell(dnaHash: Uint8Array): Promise<ClonedCell> {
    if (!client) {
      throw new Error('Client not connected');
    }
    const enabled = await client.enableCloneCell({
      clone_cell_id: { type: 'dna_hash', value: dnaHash }
    });
    // Enabling changes cell topology — the cached AppInfo is now stale.
    invalidateAppInfoCache();
    await authorizeCloneCellSigning(enabled.cell_id);
    return enabled;
  }

  async function createGroupCloneCell(networkSeed: string): Promise<ClonedCell> {
    if (!client) {
      throw new Error('Client not connected');
    }
    const cloned = await client.createCloneCell({
      role_name: 'group',
      modifiers: { network_seed: networkSeed },
      name: networkSeed
    });
    // Creating a clone changes cell topology — invalidate immediately so a read
    // through any path (not just the one that created the cell) sees it.
    invalidateAppInfoCache();
    if (!cloned.enabled) {
      // enableGroupCloneCell authorizes signing credentials for the cell.
      return enableGroupCloneCell(cloned.cell_id[0]);
    }
    // A freshly cloned, already-enabled cell still needs signing credentials.
    await authorizeCloneCellSigning(cloned.cell_id);
    return cloned;
  }

  async function createNdoCloneCell(args: {
    networkSeed: string;
    properties: NdoDnaProperties;
  }): Promise<ClonedCell> {
    if (!client) {
      throw new Error('Client not connected');
    }
    // `properties` MUST be a plain JS object (no binary fields — holochain 0.6.0
    // transports properties as YamlProperties(serde_yaml::Value), which has no
    // binary variant; an AgentPubKey here hangs createCloneCell). The conductor
    // canonicalizes it to SerializedBytes so the DnaHash is value-deterministic
    // and the ADR-013 binding inside the cell fires.
    const cloned = await client.createCloneCell({
      role_name: 'ndo',
      modifiers: { network_seed: args.networkSeed, properties: args.properties },
      name: args.properties.name
    });
    invalidateAppInfoCache();
    if (!cloned.enabled) {
      // enableGroupCloneCell is role-agnostic (keyed by DnaHash); it enables any
      // clone and authorizes signing credentials for it.
      return enableGroupCloneCell(cloned.cell_id[0]);
    }
    await authorizeCloneCellSigning(cloned.cell_id);
    return cloned;
  }

  async function ensureNdoCloneCell(
    dnaHash: Uint8Array,
    coordinates?: { networkSeed: string; properties: NdoDnaProperties }
  ): Promise<CellId> {
    if (!client) {
      throw new Error('Client not connected');
    }
    const appInfo = await client.appInfo();
    const existing = getNdoCellByDnaHash(appInfo, dnaHash);
    if (existing) {
      if (!existing.enabled) {
        // Disabled: enable + authorize (enableGroupCloneCell does both).
        await enableGroupCloneCell(existing.dnaHash);
      }
      // Do NOT re-authorize already-enabled cells: every authorize is a
      // source-chain commit that races the following zome call ("source chain
      // head has moved"). Credentials persist in-memory from create time, and
      // the connect path re-authorizes all cells after a reload.
      return existing.cellId;
    }
    if (!coordinates) {
      throw new Error('NDO cell not found and no coordinates provided to create it');
    }
    const cloned = await createNdoCloneCell(coordinates);
    return cloned.cell_id;
  }

  /**
   * Authorizes signing credentials for a clone cell created at runtime.
   * No-op in launcher mode (no admin URL; the launcher handles signing).
   */
  async function authorizeCloneCellSigning(cellId: CellId): Promise<void> {
    if (!adminWsUrl) return;
    await authorizeCellSigning(adminWsUrl, cellId);
  }

  return {
    // Getters
    get appId() {
      return appId;
    },
    get client() {
      return client;
    },
    get isConnected() {
      return isConnected;
    },
    get connectionUrl() {
      return connectionUrl;
    },
    get connectionMode() {
      return connectionMode;
    },

    // Methods
    connectClient,
    getAppInfo,
    getMyAgentPubKey,
    callZome,
    verifyConnection,
    createGroupCloneCell,
    enableGroupCloneCell,
    createNdoCloneCell,
    ensureNdoCloneCell
  };
}

const holochainClientService = createHolochainClientService();
export default holochainClientService;

// ─── Effect DI Layer ─────────────────────────────────────────────────────────

export class HolochainClientServiceTag extends Context.Tag('HolochainClientService')<
  HolochainClientServiceTag,
  HolochainClientService
>() { }

/** Wraps the singleton in a Layer so services can be composed with E.provide. */
export const HolochainClientServiceLive: Layer.Layer<HolochainClientServiceTag> = Layer.succeed(
  HolochainClientServiceTag,
  holochainClientService
);

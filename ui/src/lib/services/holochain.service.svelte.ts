import { type AppInfoResponse, AppWebsocket } from '@holochain/client';

export type ZomeName = 'zome_person' | 'zome_resource' | 'zome_gouvernance';
export type RoleName = 'nondominium';

export interface HolochainClientService {
	readonly appId: string;
	readonly client: AppWebsocket | null;
	readonly isConnected: boolean;

	connectClient(): Promise<void>;

	getAppInfo(): Promise<AppInfoResponse>;

	callZome(
		zomeName: ZomeName,
		fnName: string,
		payload: unknown,
		capSecret?: Uint8Array | undefined,
		roleName?: RoleName
	): Promise<unknown>;

	verifyConnection(): Promise<boolean>;
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

	/**
	 * Connects the client to the Host backend with retry logic.
	 */
	async function connectClient(): Promise<void> {
		// Reset connection state
		isConnected = false;
		client = null;

		try {
			console.log('Attempting to connect to Holochain conductor...');
			client = await AppWebsocket.connect();
			isConnected = true;
			console.log('✅ Successfully connected to Holochain');
		} catch (error) {
			console.warn('❌ Connection failed:', error);
			isConnected = false;
			client = null;
			throw error;
		}
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
	 * Calls a zome function on the Holochain client.
	 * @param {ZomeName} zomeName - The name of the zome.
	 * @param {string} fnName - The name of the function within the zome.
	 * @param {unknown} payload - The payload to send with the function call.
	 * @param {Uint8Array | null} capSecret - The capability secret for authorization.
	 * @param {RoleName} roleName - The name of the role to call the function on. Defaults to 'requests_and_offers'.
	 * @returns {Promise<unknown>} - The result of the zome function call.
	 */
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
		roleName: RoleName = 'nondominium'
	): Promise<unknown> {
		if (!client) {
			throw new Error('Client not connected');
		}

		try {
			return await client.callZome({
				cap_secret: capSecret,
				zome_name: zomeName,
				fn_name: fnName,
				payload,
				role_name: roleName
			});
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

		// Methods
		connectClient,
		getAppInfo,
		callZome,
		verifyConnection
	};
}

const holochainClientService = createHolochainClientService();
export default holochainClientService;

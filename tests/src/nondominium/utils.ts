import * as fs from "fs";
import {
  Conductor,
  Player,
  PlayerApp,
  Scenario,
  runScenario,
} from "@holochain/tryorama";
import {
  AppRoleManifest,
  AppWebsocket,
  Record as HolochainRecord,
  WsClient,
} from "@holochain/client";
import { decode } from "@msgpack/msgpack";
import { Base64 } from "js-base64";

const hAppPath = process.cwd() + "/../workdir/nondominium.happ";
const appSource = {
  appBundleSource: {
    type: "path" as const,
    value: hAppPath,
  },
};

export type DnaProperties = {
  progenitor_pubkey: string;
};

export async function runScenarioWithTwoAgents(
  callback: (
    scenario: Scenario,
    alice: PlayerApp,
    bob: PlayerApp
  ) => Promise<void>
): Promise<void> {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      appSource,
      appSource,
    ]);

    await scenario.shareAllAgents();

    console.log("Running scenario with Lynn and Bob");

    await callback(scenario, alice, bob);

    scenario.cleanUp();
  });
}

/**
 * Decodes a set of records using MessagePack.
 * @param records The records to decode.
 * @returns {T[]} The decoded records.
 */
export function decodeRecords<T>(records: HolochainRecord[]): T[] {
  return records.map((r) => decode((r.entry as any).Present.entry)) as T[];
}

export function decodeRecord<T>(record: HolochainRecord): T {
  return decode((record.entry as any).Present.entry) as T;
}

/**
 * Represents the type of a WebAssembly error.
 */
enum WasmErrorType {
  PointerMap = "PointerMap",
  Deserialize = "Deserialize",
  Serialize = "Serialize",
  ErrorWhileError = "ErrorWhileError",
  Memory = "Memory",
  Guest = "Guest",
  Host = "Host",
  HostShortCircuit = "HostShortCircuit",
  Compile = "Compile",
  CallError = "CallError",
  UninitializedSerializedModuleCache = "UninitializedSerializedModuleCache",
  Unknown = "Unknown",
}

/**
 * Represents a WebAssembly error.
 */
type WasmError = {
  type: WasmErrorType;
  message: string;
};

/**
 * Extracts a WebAssembly error message encapsulated within a "Guest(...)" string pattern.
 * @param message - The error message.
 * @returns {WasmError} The WebAssembly error.
 */
export function extractWasmErrorMessage(message: string): WasmError {
  const messageRegex = /Guest\("(.+)"\)/;
  const matchedMessage = message.match(messageRegex);
  console.log("message : ", matchedMessage);

  const wasmErrorTypeRegex = /type:\s*(\w+)/; // Fixed: Match word characters after 'type:' with optional whitespace
  const matchedWasmErrorType = message.match(wasmErrorTypeRegex);
  console.log("wasmErrorType : ", matchedWasmErrorType);

  const wasmError: WasmError = {
    type: matchedWasmErrorType
      ? (matchedWasmErrorType[1] as WasmErrorType)
      : WasmErrorType.Unknown,
    message: matchedMessage ? matchedMessage[1] : "Unknown error",
  };

  return wasmError;
}

/**
 * Converts a base64 encoded hash to a Uint8Array.
 * @param hash - The base64 encoded hash
 * @returns {Uint8Array} The decoded hash
 */
export function deserializeHash(hash: string): Uint8Array {
  return Base64.toUint8Array(hash.slice(1));
}

export function serializeHash(hash: Uint8Array) {
  return `u${Base64.fromUint8Array(hash, true)}`;
}

/**
 * Converts image path to ArrayBuffer for testing purposes
 * @param imagePath - Path to the image file
 * @returns Promise<ArrayBuffer> - The image as ArrayBuffer
 */
export function imagePathToArrayBuffer(
  imagePath: string
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(imagePath, (err, buffer) => {
      if (err) {
        reject(err);
        return;
      }

      // Convert Buffer to ArrayBuffer
      const arrayBuffer = Uint8Array.from(buffer).buffer;

      resolve(arrayBuffer as ArrayBuffer);
    });
  });
}

/**
 * Creates a mock image buffer for testing avatar uploads
 * @param size - Size of the mock image in bytes
 * @returns Uint8Array - Mock image data
 */
export function createMockImageBuffer(size: number = 1024): Uint8Array {
  const buffer = new Uint8Array(size);
  // Fill with mock PNG header and random data
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  for (let i = 4; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

/**
 * Creates a small valid mock image for testing
 * @returns Uint8Array - Valid minimal PNG data
 */
export function createValidMockImage(): Uint8Array {
  // Minimal valid PNG file (1x1 transparent pixel)
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d, // IHDR chunk size
    0x49,
    0x48,
    0x44,
    0x52, // IHDR
    0x00,
    0x00,
    0x00,
    0x01, // Width: 1
    0x00,
    0x00,
    0x00,
    0x01, // Height: 1
    0x08,
    0x06,
    0x00,
    0x00,
    0x00, // Bit depth: 8, Color type: 6 (RGBA), Compression: 0, Filter: 0, Interlace: 0
    0x1f,
    0x15,
    0xc4,
    0x89, // CRC
    0x00,
    0x00,
    0x00,
    0x0a, // IDAT chunk size
    0x49,
    0x44,
    0x41,
    0x54, // IDAT
    0x78,
    0x9c,
    0x62,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x01, // Compressed data
    0xe2,
    0x21,
    0xbc,
    0x33, // CRC
    0x00,
    0x00,
    0x00,
    0x00, // IEND chunk size
    0x49,
    0x45,
    0x4e,
    0x44, // IEND
    0xae,
    0x42,
    0x60,
    0x82, // CRC
  ]);
}

/**
 * Utility to wait for a specified amount of time
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

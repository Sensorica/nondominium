import type { ClonedCell, CreateCloneCellRequest } from '@holochain/client';
import type { NdoDnaProperties } from '@nondominium/shared-types';

/**
 * Whether NDO clones are registered in the Moss group DNA for other members and
 * always-online nodes (`createCloneCell(req, true)`).
 *
 * False for now. Moss 0.16.0-rc.5 cannot register a clone that carries DNA
 * properties: `join_cloned_cell` declares `properties: Option<SerializedBytes>`
 * and the renderer forwards the properties object untouched, so the call fails
 * with a Deserialize error and leaves an orphan cell. NDO clones carry the
 * immutable Layer 0 fields as properties (ADR-013). Discovery does not need the
 * registration: peers re-derive the clone from the `NdoAnchor` in the group cell.
 * Flip this when Moss accepts properties. See #162.
 */
export const PUBLIC_NDO_CLONES = false;

/** The slice of the WeaveClient this module uses. */
export interface WeaveCloneApi {
  createCloneCell(req: CreateCloneCellRequest, publicToGroupMembers: boolean): Promise<ClonedCell>;
}

/**
 * Creates the `ndo` clone for one NDO through the WeaveClient. Inside Moss the
 * applet client refuses `createCloneCell` ("use the createCloneCell method on
 * the WeaveClient instead"); the WeaveClient forwards to the same conductor.
 * `properties` stays a plain object, as the conductor expects (see
 * `HolochainClientService.createNdoCloneCell`).
 */
export function createNdoCloneViaWeave(
  weave: WeaveCloneApi,
  args: { networkSeed: string; properties: NdoDnaProperties },
  publicToGroupMembers: boolean = PUBLIC_NDO_CLONES
): Promise<ClonedCell> {
  return weave.createCloneCell(
    {
      role_name: 'ndo',
      modifiers: { network_seed: args.networkSeed, properties: args.properties },
      name: args.properties.name
    },
    publicToGroupMembers
  );
}

import { Context, Layer, Effect as E } from 'effect';
import type { GroupDescriptor, NdoDescriptor } from '@nondominium/shared-types';
import type { DomainError } from '$lib/errors';
import { STUB_SOLO_GROUP } from '../utils/stub-fixtures';

export interface LobbyService {
  getMyGroups: () => E.Effect<GroupDescriptor[], DomainError>;
  getAllNdoDescriptors: () => E.Effect<NdoDescriptor[], DomainError>;
}

export class LobbyServiceTag extends Context.Tag('LobbyService')<
  LobbyServiceTag,
  LobbyService
>() {}

export const LobbyServiceLive = Layer.succeed(LobbyServiceTag, {
  getMyGroups: () => E.succeed([STUB_SOLO_GROUP]),
  getAllNdoDescriptors: () => E.succeed([])
});

export const LobbyServiceResolved = LobbyServiceLive;

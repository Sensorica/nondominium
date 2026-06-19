import { Data } from 'effect';

export class NdoNotFoundError extends Data.TaggedError('NdoNotFoundError')<{
  hash: string;
}> { }

export class NdoNotImplementedError extends Data.TaggedError('NdoNotImplementedError')<{
  feature: string;
  message: string;
}> { }

export class LobbyConnectionError extends Data.TaggedError('LobbyConnectionError')<{
  reason: string;
}> { }

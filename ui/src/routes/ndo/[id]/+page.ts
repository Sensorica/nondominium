import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
  specHashB64: params.id
});

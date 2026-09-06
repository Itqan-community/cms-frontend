import type { PagesFunction } from '@cloudflare/workers-types';

import { proxyToStagingApi } from '../_lib/staging-proxy';

export const onRequest: PagesFunction = async (context) => proxyToStagingApi(context.request);

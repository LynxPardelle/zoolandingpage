import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

type TDraftRegistryEntry = {
  readonly domain: string;
  readonly pageId: string;
};

function isDirectory(path: string): boolean {
  try {
    return readdirSync(path, { withFileTypes: true }).length >= 0;
  } catch {
    return false;
  }
}

function resolveDraftsFolder(): string | null {
  const candidates = [
    join(process.cwd(), 'public', 'assets', 'drafts'),
    join(browserDistFolder, 'assets', 'drafts'),
  ];

  return candidates.find((candidate) => existsSync(candidate) && isDirectory(candidate)) ?? null;
}

function listDraftRegistryEntries(): readonly TDraftRegistryEntry[] {
  const draftsFolder = resolveDraftsFolder();
  if (!draftsFolder) {
    return [];
  }

  const domains = readdirSync(draftsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return domains.flatMap((domain) => {
    const domainFolder = join(draftsFolder, domain);
    return readdirSync(domainFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        domain,
        pageId: entry.name,
      }))
      .sort((left, right) => left.pageId.localeCompare(right.pageId));
  });
}

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

app.get('/api/debug/drafts', (_req, res) => {
  res.json({ drafts: listDraftRegistryEntries() });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${ port }`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

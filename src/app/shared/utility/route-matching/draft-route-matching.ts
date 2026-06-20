export type TDraftRouteLike = {
  readonly path?: unknown;
};

export type TDraftRouteMatch<T extends TDraftRouteLike> = {
  readonly route: T;
  readonly params: Readonly<Record<string, string>>;
  readonly exact: boolean;
};

type TSegmentMatch = {
  readonly matched: boolean;
  readonly params: Readonly<Record<string, string>>;
};

export function normalizeDraftRoutePath(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '/';

  const withoutHash = raw.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  let normalized = withoutQuery || '/';

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    normalized = withoutQuery || '/';
  }

  normalized = normalized.replace(/\\+/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${ normalized }`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/g, '');

  return normalized || '/';
}

export function matchDraftRoute<T extends TDraftRouteLike>(
  routes: readonly T[] | null | undefined,
  requestedPath: unknown,
): TDraftRouteMatch<T> | null {
  if (!Array.isArray(routes) || routes.length === 0) {
    return null;
  }

  const normalizedPath = normalizeDraftRoutePath(requestedPath);
  const exactRoute = routes.find((route) => normalizeDraftRoutePath(route.path) === normalizedPath);
  if (exactRoute) {
    return {
      route: exactRoute,
      params: {},
      exact: true,
    };
  }

  for (const route of routes) {
    const pattern = normalizeDraftRoutePath(route.path);
    if (!pattern.includes('/:')) {
      continue;
    }

    const match = matchPattern(pattern, normalizedPath);
    if (match.matched) {
      return {
        route,
        params: match.params,
        exact: false,
      };
    }
  }

  return null;
}

function matchPattern(pattern: string, requestedPath: string): TSegmentMatch {
  const patternSegments = splitSegments(pattern);
  const requestedSegments = splitSegments(requestedPath);
  if (patternSegments.length !== requestedSegments.length) {
    return {
      matched: false,
      params: {},
    };
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index] ?? '';
    const requestedSegment = requestedSegments[index] ?? '';

    if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1).trim();
      if (!paramName || !requestedSegment) {
        return {
          matched: false,
          params: {},
        };
      }
      params[paramName] = requestedSegment;
      continue;
    }

    if (patternSegment !== requestedSegment) {
      return {
        matched: false,
        params: {},
      };
    }
  }

  return {
    matched: true,
    params,
  };
}

function splitSegments(path: string): readonly string[] {
  return normalizeDraftRoutePath(path).split('/').filter(Boolean);
}

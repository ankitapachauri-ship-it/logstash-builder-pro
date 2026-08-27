// Logstash versions the builder supports, oldest -> newest.
// Minor granularity: docs are published per minor, and plugin option sets
// only ever change at a minor boundary.
// 7.0-7.17 is the final 7.x line; 8.0-8.19 is the final 8.x line;
// 9.0-9.4 is the current 9.x line (latest patch 9.4.3, Jun 2026).
export const VERSIONS = [
  "7.0",
  "7.1",
  "7.2",
  "7.3",
  "7.4",
  "7.5",
  "7.6",
  "7.7",
  "7.8",
  "7.9",
  "7.10",
  "7.11",
  "7.12",
  "7.13",
  "7.14",
  "7.15",
  "7.16",
  "7.17",
  "8.0",
  "8.1",
  "8.2",
  "8.3",
  "8.4",
  "8.5",
  "8.6",
  "8.7",
  "8.8",
  "8.9",
  "8.10",
  "8.11",
  "8.12",
  "8.13",
  "8.14",
  "8.15",
  "8.16",
  "8.17",
  "8.18",
  "8.19",
  "9.0",
  "9.1",
  "9.2",
  "9.3",
  "9.4",
] as const;

export type Version = (typeof VERSIONS)[number];

export const LATEST: Version = VERSIONS[VERSIONS.length - 1];

/** Compare two "major.minor" version strings. <0 if a<b, 0 if equal, >0 if a>b. */
export function cmpVersion(a: string, b: string): number {
  const [amaj, amin] = a.split(".").map((n) => parseInt(n, 10));
  const [bmaj, bmin] = b.split(".").map((n) => parseInt(n, 10));
  if (amaj !== bmaj) return amaj - bmaj;
  return (amin || 0) - (bmin || 0);
}

/**
 * Is version `v` within [since, until]? An omitted `since` means "from the
 * beginning"; an omitted `until` means "still present in the latest version".
 */
export function versionInRange(v: string, since?: string, until?: string): boolean {
  if (since && cmpVersion(v, since) < 0) return false;
  if (until && cmpVersion(v, until) > 0) return false;
  return true;
}

/** Human label for the version dropdown, e.g. "8.19" -> "8.19". */
export function versionLabel(v: string): string {
  return v;
}

/**
 * Official Elastic documentation URL for a plugin at a given version.
 * 8.x lives on the versioned guide; 9.x on the version-less new docs site.
 */
export function pluginDocUrl(
  section: "input" | "filter" | "output",
  pluginId: string,
  version: string,
): string {
  const type = `${section}s`; // inputs / filters / outputs
  if (cmpVersion(version, "9.0") >= 0) {
    // 9.x uses the new version-less docs site
    return `https://www.elastic.co/docs/reference/logstash/plugins/plugins-${type}-${pluginId}`;
  }
  // 7.x and 8.x use the versioned guide
  return `https://www.elastic.co/guide/en/logstash/${version}/plugins-${type}-${pluginId}.html`;
}

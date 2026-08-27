import { findPlugin, type Section } from "./logstash-plugins";
import type { PluginInstance } from "./logstash-generator";

// Curated 1:1 option renames (mostly the 8.x -> 9.x SSL settings overhaul),
// keyed by "section/pluginId". Only applied when the target key actually
// exists in the selected version.
const RENAMES: Record<string, Record<string, string>> = {
  "output/elasticsearch": {
    ssl: "ssl_enabled",
    cacert: "ssl_certificate_authorities",
    keystore: "ssl_keystore_path",
    truststore: "ssl_truststore_path",
  },
  "input/elasticsearch": {
    ssl: "ssl_enabled",
    ca_file: "ssl_certificate_authorities",
  },
  "input/beats": { ssl: "ssl_enabled" },
  "output/http": {
    cacert: "ssl_certificate_authorities",
    keystore: "ssl_keystore_path",
    truststore: "ssl_truststore_path",
  },
  "input/http": {
    cacert: "ssl_certificate_authorities",
    keystore: "ssl_keystore_path",
  },
  "output/tcp": {
    ssl_enable: "ssl_enabled",
    ssl_cert: "ssl_certificate",
    ssl_cacert: "ssl_certificate_authorities",
  },
  "input/tcp": {
    ssl_enable: "ssl_enabled",
    ssl_cert: "ssl_certificate",
    ssl_cacert: "ssl_certificate_authorities",
  },
};

export interface MigrationIssue {
  section: Section;
  instanceId: string;
  pluginId: string;
  key: string; // option that is set but not available in the target version
  rename?: string; // suggested replacement key, if a clean rename exists there
}

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Options that are set on this instance but don't exist in the target version. */
export function findMigrationIssues(
  section: Section,
  inst: PluginInstance,
  version: string,
): MigrationIssue[] {
  const plugin = findPlugin(section, inst.pluginId, version);
  if (!plugin) return [];
  const available = new Set(plugin.fields.map((f) => f.key));
  const renames = RENAMES[`${section}/${inst.pluginId}`] ?? {};
  const issues: MigrationIssue[] = [];
  for (const key of Object.keys(inst.values)) {
    if (isEmpty(inst.values[key]) || available.has(key)) continue;
    const target = renames[key];
    issues.push({
      section,
      instanceId: inst.id,
      pluginId: inst.pluginId,
      key,
      rename: target && available.has(target) ? target : undefined,
    });
  }
  return issues;
}

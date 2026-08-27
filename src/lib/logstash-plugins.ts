import { versionInRange } from "./logstash-versions";
import {
  GEN_INPUT_PLUGINS,
  GEN_FILTER_PLUGINS,
  GEN_OUTPUT_PLUGINS,
} from "./logstash-catalog.generated";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "secret"
  | "array" // comma-separated -> ["a","b"]
  | "kvlines"; // lines of "k: v" -> headers hash

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  showIf?: (values: Record<string, unknown>) => boolean;
  /** First Logstash version this option exists in (omit = from 8.0). */
  since?: string;
  /** Last Logstash version this option exists in (omit = still present). */
  until?: string;
  /** Rare mid-range changes to type/options/etc., applied when version >= from. */
  overrides?: { from: string; patch: Partial<FieldDef> }[];
}

export interface PluginDef {
  id: string;
  label: string;
  fields: FieldDef[];
  /** First Logstash version this plugin ships in (omit = from 8.0). */
  since?: string;
  /** Last Logstash version this plugin ships in (omit = still present). */
  until?: string;
}

export type Section = "input" | "filter" | "output";

// ---------------------------------------------------------------------------
// Curated special-case plugins that are NOT auto-extracted.
// `drop` is rendered by the generator as `if <condition> { drop {} }` rather
// than a normal plugin block, so it keeps a hand-authored single field.
// ---------------------------------------------------------------------------
const DROP_PLUGIN: PluginDef = {
  id: "drop",
  label: "drop",
  // No own fields — set a Condition on the node to drop only matching events.
  fields: [],
};

const byId = (a: PluginDef, b: PluginDef) => a.id.localeCompare(b.id);

// The catalog is the doc-extracted generated set (per-version accurate) plus
// the curated special-cases above.
export const PLUGINS: Record<Section, PluginDef[]> = {
  input: [...GEN_INPUT_PLUGINS].sort(byId),
  filter: [...GEN_FILTER_PLUGINS, DROP_PLUGIN].sort(byId),
  output: [...GEN_OUTPUT_PLUGINS].sort(byId),
};

/** Apply any `overrides` whose `from` version is <= the selected version. */
function applyFieldOverrides(field: FieldDef, version: string): FieldDef {
  if (!field.overrides?.length) return field;
  let out = field;
  for (const { from, patch } of field.overrides) {
    if (versionInRange(version, from, undefined)) out = { ...out, ...patch };
  }
  return out;
}

/**
 * Resolve a plugin definition for a specific Logstash version: returns
 * undefined if the plugin doesn't exist in that version, otherwise a copy
 * with only the fields available in that version (overrides applied).
 */
export function resolvePluginForVersion(plugin: PluginDef, version: string): PluginDef | undefined {
  if (!versionInRange(version, plugin.since, plugin.until)) return undefined;
  const fields = plugin.fields
    .filter((f) => versionInRange(version, f.since, f.until))
    .map((f) => applyFieldOverrides(f, version));
  return { ...plugin, fields };
}

/** Plugins available in a section for the given version, resolved. */
export function getPlugins(section: Section, version: string): PluginDef[] {
  return PLUGINS[section]
    .map((p) => resolvePluginForVersion(p, version))
    .filter((p): p is PluginDef => p !== undefined);
}

/**
 * Find a plugin by id. When `version` is provided the returned definition is
 * resolved for that version (fields filtered); returns undefined if the plugin
 * is not available in that version. When `version` is omitted the raw
 * definition (all fields) is returned.
 */
export function findPlugin(section: Section, id: string, version?: string): PluginDef | undefined {
  const raw = PLUGINS[section].find((p) => p.id === id);
  if (!raw) return undefined;
  if (version === undefined) return raw;
  return resolvePluginForVersion(raw, version);
}

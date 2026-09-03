import { findPlugin, type FieldDef, type PluginDef, type Section } from "./logstash-plugins";
import { LATEST } from "./logstash-versions";

export interface PluginInstance {
  id: string; // unique instance id
  pluginId: string;
  values: Record<string, unknown>;
  secretKeystore: Record<string, boolean>; // per-field toggle
  shownOptional?: string[]; // optional field keys the user has added to the form
  condition?: string; // optional `if <cond>` guard (filters/outputs only)
}

export interface BuilderState {
  pipelineName: string;
  inputs: PluginInstance[];
  filters: PluginInstance[];
  outputs: PluginInstance[];
}

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function toEnvVar(pluginId: string, key: string): string {
  return `${pluginId}_${key}`.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function escapeString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseKvLines(raw: string): Array<[string, string]> {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf(":");
      if (idx === -1) return [l, ""] as [string, string];
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()] as [string, string];
    })
    .filter(([k]) => k);
}

function parseArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface RenderCtx {
  keystoreVars: Set<string>;
  warnings: string[];
}

function renderField(
  plugin: PluginDef,
  field: FieldDef,
  value: unknown,
  keystoreOn: boolean,
  ctx: RenderCtx,
  indent: string,
): string | null {
  if (isEmpty(value)) return null;

  const line = (v: string) => `${indent}${field.key} => ${v}`;

  switch (field.type) {
    case "boolean":
      return line(value ? "true" : "false");
    case "number":
      return line(String(value));
    case "select":
    case "text":
    case "textarea": {
      const s = String(value);
      if (field.type === "textarea" && s.includes("\n")) {
        // multiline: single-quote heredoc-ish; use double quotes and escape
        return line(`"${escapeString(s)}"`);
      }
      return line(`"${escapeString(s)}"`);
    }
    case "secret": {
      if (keystoreOn) {
        const name = toEnvVar(plugin.id, field.key);
        ctx.keystoreVars.add(name);
        return line(`"\${${name}}"`);
      }
      ctx.warnings.push(`${plugin.id}.${field.key}`);
      return `${line(`"${escapeString(String(value))}"`)} # WARNING: move to keystore`;
    }
    case "array": {
      const arr = parseArray(value);
      if (arr.length === 0) return null;
      return line(`[${arr.map((s) => `"${escapeString(s)}"`).join(", ")}]`);
    }
    case "kvlines": {
      const raw = typeof value === "string" ? value : "";
      const pairs = parseKvLines(raw);
      if (pairs.length === 0) return null;
      const inner = pairs
        .map(([k, v]) => `${indent}  "${escapeString(k)}" => "${escapeString(v)}"`)
        .join("\n");
      return `${indent}${field.key} => {\n${inner}\n${indent}}`;
    }
  }
}

function renderPluginBlock(
  section: Section,
  inst: PluginInstance,
  ctx: RenderCtx,
  indent: string,
  version: string,
): string {
  const plugin = findPlugin(section, inst.pluginId, version);
  if (!plugin) return "";
  const inner: string[] = [];
  for (const field of plugin.fields) {
    if (field.showIf && !field.showIf(inst.values)) continue;
    const rendered = renderField(
      plugin,
      field,
      inst.values[field.key],
      !!inst.secretKeystore[field.key],
      ctx,
      indent + "    ",
    );
    if (rendered) inner.push(rendered);
  }
  return `${indent}  ${plugin.id} {\n${inner.join("\n")}\n${indent}  }`;
}

export interface GenerateResult {
  config: string;
  keystoreVars: string[];
  plaintextSecretWarnings: string[];
}

/**
 * F-12: Sanitise user-supplied `if` condition strings.
 * Strip `}` and `{` so a crafted condition can't close the enclosing block
 * and inject arbitrary config sections.
 */
function sanitizeCondition(raw: string): string {
  return raw.replace(/[{}]/g, "").trim();
}

export function generateConfig(state: BuilderState, version: string = LATEST): GenerateResult {
  const ctx: RenderCtx = { keystoreVars: new Set(), warnings: [] };
  const parts: string[] = [];

  // Input (one input { } block containing every input plugin)
  if (state.inputs.length > 0) {
    const blocks = state.inputs
      .map((i) => renderPluginBlock("input", i, ctx, "", version))
      .filter(Boolean);
    if (blocks.length) parts.push(`input {\n${blocks.join("\n\n")}\n}`);
  }

  // Filters (combined into one filter { } block, in order)
  if (state.filters.length > 0) {
    const blocks: string[] = [];
    for (const f of state.filters) {
      const plugin = findPlugin("filter", f.pluginId, version);
      if (!plugin) continue;
      const cond = sanitizeCondition(f.condition ?? "");
      const extra = cond ? "  " : "";
      // drop renders as an empty block; everything else via renderPluginBlock.
      const inner =
        plugin.id === "drop"
          ? `${extra}  drop {}`
          : renderPluginBlock("filter", f, ctx, extra, version);
      blocks.push(cond ? `  if ${cond} {\n${inner}\n  }` : inner);
    }
    if (blocks.length) {
      parts.push(`filter {\n${blocks.join("\n\n")}\n}`);
    }
  }

  // Output (one output { } block containing every output plugin)
  if (state.outputs.length > 0) {
    const blocks: string[] = [];
    for (const o of state.outputs) {
      if (!findPlugin("output", o.pluginId, version)) continue;
      const cond = sanitizeCondition(o.condition ?? "");
      const extra = cond ? "  " : "";
      const inner = renderPluginBlock("output", o, ctx, extra, version);
      blocks.push(cond ? `  if ${cond} {\n${inner}\n  }` : inner);
    }
    if (blocks.length) parts.push(`output {\n${blocks.join("\n\n")}\n}`);
  }

  const keystoreVars = Array.from(ctx.keystoreVars).sort();
  const timestamp = new Date().toISOString();
  const header = [
    `# Generated by Logstash Config Builder`,
    `# Pipeline: ${state.pipelineName || "(unnamed)"}`,
    `# Target Logstash version: ${version}`,
    `# Generated at: ${timestamp}`,
    `# Keystore variables required: ${keystoreVars.length ? keystoreVars.map((v) => "${" + v + "}").join(", ") : "(none)"}`,
    "",
  ].join("\n");

  return {
    config: header + "\n" + parts.join("\n\n") + "\n",
    keystoreVars,
    plaintextSecretWarnings: ctx.warnings,
  };
}

export interface ValidationError {
  section: Section;
  instanceId: string;
  fieldKey: string;
  label: string;
  pluginId: string;
}

export function validate(state: BuilderState, version: string = LATEST): ValidationError[] {
  const errors: ValidationError[] = [];
  const check = (section: Section, inst: PluginInstance) => {
    const plugin = findPlugin(section, inst.pluginId, version);
    if (!plugin) return;
    for (const f of plugin.fields) {
      if (f.showIf && !f.showIf(inst.values)) continue;
      if (f.required && isEmpty(inst.values[f.key])) {
        errors.push({
          section,
          instanceId: inst.id,
          fieldKey: f.key,
          label: f.label,
          pluginId: plugin.id,
        });
      }
    }
  };
  state.inputs.forEach((i) => check("input", i));
  state.filters.forEach((f) => check("filter", f));
  state.outputs.forEach((o) => check("output", o));
  return errors;
}

// highlightConfig() removed — F-05/F-15: dead code that returned raw HTML strings,
// creating a latent XSS sink. Syntax highlighting is handled by EuiCodeBlock.

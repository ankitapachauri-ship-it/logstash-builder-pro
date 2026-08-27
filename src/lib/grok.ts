import raw from "./grok-patterns.raw.txt?raw";

// name -> raw regex definition (may reference other patterns via %{NAME})
const PATTERNS = new Map<string, string>();
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const m = t.match(/^(\S+)\s+(.*)$/);
  if (m) PATTERNS.set(m[1], m[2]);
}

// Best-effort Oniguruma (Ruby) -> JavaScript regex conversion.
function oniToJs(re: string): string {
  return re
    .replace(/\[:alnum:\]/g, "A-Za-z0-9")
    .replace(/\[:alpha:\]/g, "A-Za-z")
    .replace(/\[:digit:\]/g, "0-9")
    .replace(/\[:xdigit:\]/g, "0-9A-Fa-f")
    .replace(/\[:upper:\]/g, "A-Z")
    .replace(/\[:lower:\]/g, "a-z")
    .replace(/\[:space:\]/g, "\\s")
    .replace(/\[:word:\]/g, "\\w")
    .replace(/\\h/g, "[0-9A-Fa-f]")
    .replace(/\(\?>/g, "(?:"); // atomic groups -> non-capturing
}

export interface GrokTestResult {
  status: 'match' | 'nomatch' | 'empty' | 'error'
  fields?: { name: string; value: string }[]
  message?: string
}

function compile(pattern: string): { regex: RegExp; fields: Record<string, string> } {
  const used = new Map<string, number>();
  const fields: Record<string, string> = {}; // jsGroupName -> display field name

  const sanitize = (raw: string): string => {
    const display = raw.split(":")[0];
    let base = display.replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
    if (!base || /^[0-9]/.test(base)) base = "f_" + base;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const name = count === 0 ? base : `${base}_${count}`;
    fields[name] = display;
    return name;
  };

  const expand = (pat: string, depth: number): string => {
    if (depth > 30) throw new Error("pattern nested too deeply");
    return pat.replace(/%\{([A-Z0-9_]+)(?::([^}]+))?\}/g, (_m, name: string, field?: string) => {
      const def = PATTERNS.get(name);
      if (!def) throw new Error(`unknown pattern %{${name}}`);
      const inner = expand(def, depth + 1);
      return field ? `(?<${sanitize(field)}>${inner})` : `(?:${inner})`;
    });
  };

  const source = oniToJs(expand(pattern, 0));
  return { regex: new RegExp(source), fields };
}

/** Run a grok pattern against a sample line. Best-effort (JS regex engine). */
export function testGrok(pattern: string, sample: string): GrokTestResult {
  if (!pattern.trim()) return { status: "empty" };
  if (!sample) return { status: "empty" };
  let compiled: { regex: RegExp; fields: Record<string, string> };
  try {
    compiled = compile(pattern);
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  let m: RegExpExecArray | null;
  try {
    m = compiled.regex.exec(sample);
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  if (!m) return { status: "nomatch" };
  const groups = m.groups ?? {};
  const fields = Object.entries(compiled.fields)
    .filter(([g]) => groups[g] !== undefined)
    .map(([g, display]) => ({ name: display, value: String(groups[g]) }));
  return { status: "match", fields };
}

/** Extract the first pattern from a grok `match` value ("field: pattern" lines). */
export function firstMatchPattern(matchRaw: string): string {
  const line = (matchRaw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!line) return "";
  const idx = line.indexOf(":");
  return idx === -1 ? line : line.slice(idx + 1).trim();
}

// ---- Auto-suggest a grok pattern from a sample line ----

// Expand a pattern to a capture-free regex string (for anchored token probing).
function expandNC(pat: string, depth: number): string {
  if (depth > 30) return pat;
  return pat.replace(/%\{([A-Z0-9_]+)(?::[^}]+)?\}/g, (_m, name: string) => {
    const def = PATTERNS.get(name);
    return def ? `(?:${expandNC(def, depth + 1)})` : "";
  });
}

// Ordered most-specific-first; each token is matched anchored at the cursor.
const SUGGEST_ORDER = [
  "TIMESTAMP_ISO8601",
  "HTTPDATE",
  "SYSLOGTIMESTAMP",
  "DATESTAMP",
  "IPV4",
  "IPV6",
  "MAC",
  "UUID",
  "EMAILADDRESS",
  "QUOTEDSTRING",
  "LOGLEVEL",
  "NUMBER",
  "NOTSPACE",
];
const FIELD_BASE: Record<string, string> = {
  TIMESTAMP_ISO8601: "timestamp",
  HTTPDATE: "timestamp",
  SYSLOGTIMESTAMP: "timestamp",
  DATESTAMP: "timestamp",
  IPV4: "ip",
  IPV6: "ip",
  MAC: "mac",
  UUID: "uuid",
  EMAILADDRESS: "email",
  QUOTEDSTRING: "string",
  LOGLEVEL: "level",
  NUMBER: "num",
  NOTSPACE: "field",
};

const SUGGEST_RE = new Map<string, RegExp>();
for (const name of SUGGEST_ORDER) {
  try {
    SUGGEST_RE.set(name, new RegExp("^(?:" + oniToJs(expandNC(`%{${name}}`, 0)) + ")"));
  } catch {
    // skip patterns that don't compile in JS
  }
}

const escapeLiteral = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Characters treated as literal structural delimiters in smart-escape mode
const STRUCTURAL_RE = /^[\[\]()\{\}|;]/;
const STRUCTURAL_BOUNDARY_RE = /[\[\]()\{\}|;:]/;

/**
 * Best-effort: propose a grok pattern that parses the given sample line.
 *
 * @param smartEscape When true, characters like [ ] ( ) | ; are always
 *   emitted as escaped literals, and NOTSPACE is prevented from crossing
 *   colon `:` boundaries — producing cleaner field captures.
 */
export function suggestGrok(sample: string, smartEscape = false): string {
  const line = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  if (!line) return "";
  const counters = new Map<string, number>();
  const nameFor = (base: string) => {
    const c = (counters.get(base) ?? 0) + 1;
    counters.set(base, c);
    return c === 1 ? base : `${base}${c}`;
  };
  const out: string[] = [];
  let lit = "";
  const flush = () => {
    if (lit) {
      out.push(escapeLiteral(lit));
      lit = "";
    }
  };

  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);

    // Whitespace is always a literal separator
    const ws = /^\s+/.exec(rest);
    if (ws) {
      lit += ws[0];
      i += ws[0].length;
      continue;
    }

    // In smart-escape mode: bracket/pipe/semicolon chars → always literal
    if (smartEscape && STRUCTURAL_RE.test(rest)) {
      lit += line[i];
      i += 1;
      continue;
    }

    let matched = false;
    for (const name of SUGGEST_ORDER) {
      const re = SUGGEST_RE.get(name);
      if (!re) continue;
      let m = re.exec(rest);
      if (!m || m[0].length === 0) continue;

      // In smart-escape mode: prevent NOTSPACE from swallowing structural chars or colons
      if (smartEscape && name === "NOTSPACE") {
        const boundary = rest.search(STRUCTURAL_BOUNDARY_RE);
        if (boundary === 0) {
          // Starts with a structural char — don't use NOTSPACE here
          m = null as unknown as RegExpExecArray;
        } else if (boundary > 0 && m[0].length > boundary) {
          // NOTSPACE would cross a boundary — clip it
          // Re-match with a restricted pattern
          const restricted = new RegExp(`^[^\\s\\[\\](){}|;:]{1,${boundary}}`);
          const rm = restricted.exec(rest);
          if (rm && rm[0].length > 0) {
            flush();
            out.push(`%{NOTSPACE:${nameFor(FIELD_BASE[name])}}`);
            i += rm[0].length;
            matched = true;
            break;
          } else {
            m = null as unknown as RegExpExecArray;
          }
        }
      }

      if (m && m[0].length > 0) {
        flush();
        out.push(`%{${name}:${nameFor(FIELD_BASE[name])}}`);
        i += m[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      lit += line[i];
      i += 1;
    }
  }
  flush();
  return out.join("");
}

/** The source field name in the first line of a grok `match` value (default "message"). */
export function firstMatchField(matchRaw: string): string {
  const line = (matchRaw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  if (!line) return "message";
  const idx = line.indexOf(":");
  return idx === -1 ? "message" : line.slice(0, idx).trim() || "message";
}

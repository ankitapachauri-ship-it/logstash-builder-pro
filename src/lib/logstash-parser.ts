import { findPlugin, type FieldType, type Section } from "./logstash-plugins";

// A best-effort Logstash pipeline config parser: turns a logstash.conf string
// into the builder's model (plugin instances with values + optional if-guards).

export interface ParsedInstance {
  pluginId: string;
  values: Record<string, unknown>;
  condition?: string;
}
export interface ParseResult {
  inputs: ParsedInstance[];
  filters: ParsedInstance[];
  outputs: ParsedInstance[];
  warnings: string[];
}

type PVal =
  | { t: "str" | "num" | "word"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "array"; v: PVal[] }
  | { t: "hash"; v: [string, PVal][] };

const combine = (a: string | undefined, b: string | undefined): string | undefined => {
  if (a && b) return `(${a}) and (${b})`;
  return a || b;
};

class Parser {
  i = 0;
  out: ParseResult = { inputs: [], filters: [], outputs: [], warnings: [] };

  private s: string
  private version: string

  constructor(s: string, version: string) {
    this.s = s
    this.version = version
  }

  private ws() {
    for (;;) {
      const c = this.s[this.i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") this.i++;
      else if (c === "#") {
        while (this.i < this.s.length && this.s[this.i] !== "\n") this.i++;
      } else break;
    }
  }
  private cur() {
    this.ws();
    return this.s[this.i];
  }
  private ident(): string {
    this.ws();
    const m = /^[A-Za-z_][A-Za-z0-9_.\-]*/.exec(this.s.slice(this.i));
    if (!m) return "";
    this.i += m[0].length;
    return m[0];
  }
  private expect(ch: string) {
    this.ws();
    if (this.s[this.i] !== ch)
      throw new Error(
        `expected "${ch}" near: ${JSON.stringify(this.s.slice(this.i, this.i + 30))}`,
      );
    this.i++;
  }
  private expectArrow() {
    this.ws();
    if (this.s.slice(this.i, this.i + 2) !== "=>")
      throw new Error(`expected "=>" near: ${JSON.stringify(this.s.slice(this.i, this.i + 30))}`);
    this.i += 2;
  }
  private str(q: string): string {
    this.i++; // opening quote
    let out = "";
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if (c === "\\") {
        const n = this.s[this.i++];
        out += n === '"' || n === "'" || n === "\\" ? n : "\\" + n;
      } else if (c === q) return out;
      else out += c;
    }
    throw new Error("unterminated string");
  }
  private value(): PVal {
    this.ws();
    const c = this.s[this.i];
    if (c === '"' || c === "'") return { t: "str", v: this.str(c) };
    if (c === "[") return this.array();
    if (c === "{") return this.hash();
    const m = /^[^\s,\]}#]+/.exec(this.s.slice(this.i));
    if (!m)
      throw new Error(
        "expected a value near: " + JSON.stringify(this.s.slice(this.i, this.i + 20)),
      );
    this.i += m[0].length;
    const w = m[0];
    if (/^-?\d+(?:\.\d+)?$/.test(w)) return { t: "num", v: w };
    if (w === "true" || w === "false") return { t: "bool", v: w === "true" };
    return { t: "word", v: w };
  }
  private array(): PVal {
    this.expect("[");
    const arr: PVal[] = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "]") {
        this.i++;
        break;
      }
      arr.push(this.value());
      this.ws();
      if (this.s[this.i] === ",") this.i++;
    }
    return { t: "array", v: arr };
  }
  private hashKey(): string {
    this.ws();
    const c = this.s[this.i];
    if (c === '"' || c === "'") return this.str(c);
    return this.ident();
  }
  private hash(): PVal {
    this.expect("{");
    const pairs: [string, PVal][] = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "}") {
        this.i++;
        break;
      }
      const k = this.hashKey();
      this.expectArrow();
      pairs.push([k, this.value()]);
    }
    return { t: "hash", v: pairs };
  }
  // Capture a condition expression up to the block-opening "{", honoring
  // string and /regex/ literals (so /\d{2}/ doesn't end the scan early).
  private condition(): string {
    this.ws();
    let out = "";
    let inStr: string | null = null;
    let inRe = false;
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (inStr) {
        out += c;
        this.i++;
        if (c === "\\") {
          out += this.s[this.i] ?? "";
          this.i++;
        } else if (c === inStr) inStr = null;
        continue;
      }
      if (inRe) {
        out += c;
        this.i++;
        if (c === "\\") {
          out += this.s[this.i] ?? "";
          this.i++;
        } else if (c === "/") inRe = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = c;
        out += c;
        this.i++;
        continue;
      }
      if (c === "/") {
        inRe = true;
        out += c;
        this.i++;
        continue;
      }
      if (c === "{") break;
      out += c;
      this.i++;
    }
    return out.trim();
  }

  private scalar(v: PVal): string {
    switch (v.t) {
      case "str":
      case "num":
      case "word":
        return v.v;
      case "bool":
        return v.v ? "true" : "false";
      case "array":
        return v.v.map((x) => this.scalar(x)).join(", ");
      case "hash":
        return v.v.map(([k, val]) => `${k}: ${this.scalar(val)}`).join("\n");
    }
  }
  private toFieldValue(v: PVal, type?: FieldType): unknown {
    if (type === "boolean") return v.t === "bool" ? v.v : this.scalar(v) === "true";
    if (type === "array")
      return v.t === "array" ? v.v.map((x) => this.scalar(x)).join(", ") : this.scalar(v);
    if (type === "kvlines")
      return v.t === "hash"
        ? v.v.map(([k, val]) => `${k}: ${this.scalar(val)}`).join("\n")
        : this.scalar(v);
    return this.scalar(v);
  }

  private plugin(section: Section, cond: string | undefined) {
    const name = this.ident();
    this.expect("{");
    const pairs: [string, PVal][] = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "}") {
        this.i++;
        break;
      }
      const key = this.hashKey();
      this.expectArrow();
      pairs.push([key, this.value()]);
    }
    const plugin = findPlugin(section, name, this.version);
    if (!plugin) this.out.warnings.push(`Unknown ${section} plugin "${name}" (kept as-is).`);
    const values: Record<string, unknown> = {};
    for (const [k, val] of pairs) {
      const field = plugin?.fields.find((f) => f.key === k);
      if (plugin && !field)
        this.out.warnings.push(
          `"${name}.${k}" isn't a known option in Logstash ${this.version} — imported but may not re-export.`,
        );
      values[k] = this.toFieldValue(val, field?.type);
    }
    const inst: ParsedInstance = { pluginId: name, values };
    if (cond) inst.condition = cond;
    this.out[`${section}s` as "inputs" | "filters" | "outputs"].push(inst);
  }

  private blockBody(section: Section, cond: string | undefined) {
    for (;;) {
      const c = this.cur();
      if (c === undefined) throw new Error("unexpected end of file (missing `}`)");
      if (c === "}") {
        this.i++;
        break;
      }
      const save = this.i;
      const word = this.ident();
      if (word === "if" || word === "else") {
        let branch: string | undefined;
        if (word === "else") {
          const s2 = this.i;
          if (this.ident() === "if") branch = this.condition();
          else {
            this.i = s2;
            this.out.warnings.push(
              "An `else` branch was imported without its (negated) condition.",
            );
          }
        } else {
          branch = this.condition();
        }
        this.expect("{");
        this.blockBody(section, combine(cond, branch));
      } else if (word) {
        this.i = save; // rewind; plugin() re-reads the name
        this.plugin(section, cond);
      } else {
        throw new Error(
          "unexpected token near: " + JSON.stringify(this.s.slice(this.i, this.i + 20)),
        );
      }
    }
  }

  parse(): ParseResult {
    for (;;) {
      const c = this.cur();
      if (c === undefined) break;
      const kw = this.ident();
      if (kw === "input" || kw === "filter" || kw === "output") {
        this.expect("{");
        this.blockBody(kw, undefined);
      } else {
        throw new Error(
          `expected input/filter/output near: ${JSON.stringify(this.s.slice(this.i, this.i + 30))}`,
        );
      }
    }
    return this.out;
  }
}

export function parseLogstashConfig(text: string, version: string): ParseResult {
  return new Parser(text, version).parse();
}

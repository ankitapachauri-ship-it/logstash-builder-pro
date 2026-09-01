// Orchestration layer: user prompt → Jina retrieval → Anthropic generation → parse
// All API calls happen in the browser using keys the user stores in localStorage.

import { getPluginEmbeddings, findRelevantPlugins } from './jina'
import type { ScoredPlugin } from './jina'
import { PLUGIN_DESCRIPTIONS } from './plugin-descriptions'
import { findPlugin } from './logstash-plugins'
import type { Section } from './logstash-plugins'
import { parseLogstashConfig } from './logstash-parser'
import type { ParseResult } from './logstash-parser'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GenerationResult {
  confText: string
  parseResult: ParseResult
  selectedPlugins: ScoredPlugin[]
}

// ── Anthropic config ──────────────────────────────────────────────────────────
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
// claude-sonnet-5 balances quality and speed well for this task
const ANTHROPIC_MODEL = 'claude-sonnet-5'

// ── Build context string from selected plugins ────────────────────────────────
function buildContext(selected: ScoredPlugin[]): string {
  const parts: string[] = []

  for (const { id, section } of selected) {
    const plugin = findPlugin(section as Section, id)
    const desc = PLUGIN_DESCRIPTIONS.find(d => d.id === id && d.section === section)
    if (!plugin) continue

    const fieldLines = plugin.fields
      .slice(0, 20) // cap per-plugin field count to keep context tight
      .map(f => {
        const req = f.required ? ' [REQUIRED]' : ''
        const help = f.help ? ` — ${f.help.replace(/\s*—\s*Default:.*$/, '')}` : ''
        return `  ${f.key} (${f.type})${req}${help}`
      })
      .join('\n')

    parts.push(
      `### ${section.toUpperCase()} › ${id}`,
      desc ? desc.description : '',
      fieldLines,
      '',
    )
  }

  return parts.join('\n')
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(pluginContext: string, version: string): string {
  return `\
You are a Logstash pipeline configuration expert. The user will describe what they want to do with their data in plain language. Your job is to produce a valid Logstash .conf file that achieves their goal.

Rules:
1. Output ONLY valid Logstash conf syntax — no markdown fences, no comments beyond essential ones, no explanation text
2. Use ONLY plugins from the list provided below — do not invent plugin names
3. Every pipeline must have at least one input section and one output section
4. For log parsing, default to grok with a pattern that matches the user's described format
5. For timestamps, always include a date filter to parse the log's native timestamp into @timestamp
6. Fill sensible defaults for required fields (e.g. elasticsearch hosts => ["localhost:9200"])
7. Target Logstash version: ${version}
8. Start the output with "input {" on the first line — no preamble

Available plugins:
${pluginContext}

Output format:
input {
  plugin_name {
    field => value
  }
}
filter {
  plugin_name {
    field => value
  }
}
output {
  plugin_name {
    field => value
  }
}`
}

// ── Main generation function ──────────────────────────────────────────────────
export async function generatePipelineFromPrompt(opts: {
  userPrompt: string
  jinaApiKey: string
  anthropicApiKey: string
  logstashVersion: string
  onProgress?: (step: string) => void
}): Promise<GenerationResult> {
  const { userPrompt, jinaApiKey, anthropicApiKey, logstashVersion, onProgress } = opts

  // 1. Prepare plugin descriptions for embedding
  const descriptions = PLUGIN_DESCRIPTIONS.map(d => ({
    id: d.id,
    section: d.section,
    text: `${d.section} plugin "${d.id}": ${d.description}`,
  }))

  // 2. Get plugin embeddings (cached in localStorage after first call)
  onProgress?.('Indexing plugin catalog…')
  const pluginVectors = await getPluginEmbeddings(descriptions, jinaApiKey, onProgress)

  // 3. Find top-K plugins relevant to the user's prompt
  onProgress?.('Finding relevant plugins…')
  const relevant = await findRelevantPlugins(userPrompt, pluginVectors, jinaApiKey, 10)

  // 4. Build LLM context and call Anthropic
  onProgress?.('Generating pipeline with Claude…')
  const pluginContext = buildContext(relevant)
  const systemPrompt = buildSystemPrompt(pluginContext, logstashVersion)

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      // Required header for direct browser access (acknowledges key exposure)
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${body || res.statusText}`)
  }

  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confText: string = ((data.content as any[])[0]?.text ?? '').trim()

  if (!confText) throw new Error('Claude returned an empty response')

  // 5. Parse the generated config into the builder's model
  onProgress?.('Parsing generated config…')
  const parseResult = parseLogstashConfig(confText, logstashVersion)

  if (
    parseResult.inputs.length === 0 &&
    parseResult.filters.length === 0 &&
    parseResult.outputs.length === 0
  ) {
    throw new Error(
      'Claude generated a config but no plugins could be parsed from it. Try rephrasing your prompt.',
    )
  }

  return { confText, parseResult, selectedPlugins: relevant }
}

// Jina AI embedding client
// Docs: https://jina.ai/embeddings/
// Model: jina-embeddings-v3 — multilingual, task-aware, 1024-dim

const JINA_API_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'

// ── Storage key names ─────────────────────────────────────────────────────────
// F-02: API keys use sessionStorage (cleared on tab close, not persisted to disk).
//        Embedding cache stays in localStorage — it's large, safe, and expensive to rebuild.
const KEY_JINA = 'lb_jina_api_key'
const KEY_ANTHROPIC = 'lb_anthropic_api_key'
const KEY_PLUGIN_CACHE = 'lb_plugin_embeddings_v1'

// ── Key management ────────────────────────────────────────────────────────────
export function getJinaKey(): string { return sessionStorage.getItem(KEY_JINA) ?? '' }
export function setJinaKey(k: string) { sessionStorage.setItem(KEY_JINA, k.trim()) }
export function getAnthropicKey(): string { return sessionStorage.getItem(KEY_ANTHROPIC) ?? '' }
export function setAnthropicKey(k: string) { sessionStorage.setItem(KEY_ANTHROPIC, k.trim()) }

// ── Low-level embedding call ──────────────────────────────────────────────────
async function embedTexts(
  texts: string[],
  apiKey: string,
  task: 'retrieval.query' | 'retrieval.passage' = 'retrieval.passage',
): Promise<number[][]> {
  const res = await fetch(JINA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: JINA_MODEL, input: texts, task }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Jina API ${res.status}: ${body || res.statusText}`)
  }

  const json = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data as any[]).map(d => d.embedding as number[])
}

// ── Cosine similarity ─────────────────────────────────────────────────────────
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

// ── Plugin embedding cache ────────────────────────────────────────────────────
export interface PluginVector {
  id: string
  section: string
  embedding: number[]
}

interface Cache { count: number; plugins: PluginVector[] }

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(KEY_PLUGIN_CACHE)
    return raw ? (JSON.parse(raw) as Cache) : null
  } catch {
    return null
  }
}

function writeCache(data: Cache) {
  try { localStorage.setItem(KEY_PLUGIN_CACHE, JSON.stringify(data)) } catch { /* quota */ }
}

export function clearEmbeddingCache() {
  localStorage.removeItem(KEY_PLUGIN_CACHE)
}

/**
 * Returns plugin embeddings, using localStorage cache when available.
 * Re-embeds if the catalog size changed (new plugins added).
 */
export async function getPluginEmbeddings(
  descriptions: Array<{ id: string; section: string; text: string }>,
  apiKey: string,
  onProgress?: (msg: string) => void,
): Promise<PluginVector[]> {
  const cached = readCache()
  if (cached && cached.count === descriptions.length) return cached.plugins

  onProgress?.(`Embedding ${descriptions.length} plugins (one-time, then cached)…`)

  // Batch in groups of 20 to stay within Jina's per-request limit
  const BATCH = 20
  const all: PluginVector[] = []
  for (let i = 0; i < descriptions.length; i += BATCH) {
    const slice = descriptions.slice(i, i + BATCH)
    const vectors = await embedTexts(slice.map(d => d.text), apiKey, 'retrieval.passage')
    slice.forEach((d, j) => all.push({ id: d.id, section: d.section, embedding: vectors[j] }))
  }

  writeCache({ count: descriptions.length, plugins: all })
  return all
}

// ── Retrieval ─────────────────────────────────────────────────────────────────
export interface ScoredPlugin { id: string; section: string; score: number }

export async function findRelevantPlugins(
  userPrompt: string,
  pluginVectors: PluginVector[],
  apiKey: string,
  topK = 10,
): Promise<ScoredPlugin[]> {
  const [queryVec] = await embedTexts([userPrompt], apiKey, 'retrieval.query')

  return pluginVectors
    .map(p => ({ id: p.id, section: p.section, score: cosine(queryVec, p.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

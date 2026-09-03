import { useState, useRef, useCallback } from 'react'
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiTextArea,
  EuiFormRow,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiBadge,
  EuiLoadingSpinner,
  EuiHorizontalRule,
  EuiAccordion,
  EuiIcon,
  EuiButtonGroup,
} from '@elastic/eui'
import { useBuilderStore, DEFAULT_PIPELINE_SETTINGS } from '../../store/useBuilderStore'
import { generatePipelineFromPrompt } from '../../lib/pipeline-ai'
import type { GenerationResult } from '../../lib/pipeline-ai'
import { getJinaKey, setJinaKey, getAnthropicKey, setAnthropicKey, clearEmbeddingCache } from '../../lib/jina'
import type { PluginInstance } from '../../lib/logstash-generator'

type Step = 'idle' | 'running' | 'done' | 'error'
type ApplyMode = 'replace' | 'new-tab'

function toInstance(p: { pluginId: string; values: Record<string, unknown>; condition?: string }): PluginInstance {
  return {
    id: crypto.randomUUID(),
    pluginId: p.pluginId,
    values: p.values,
    secretKeystore: {},
    shownOptional: [],
    condition: p.condition,
  }
}

const EXAMPLE_PROMPTS = [
  'Parse nginx access logs from /var/log/nginx/access.log and send to Elasticsearch',
  'Read from Kafka topic "app-logs", parse JSON messages, add geo location for IP fields, output to Elasticsearch',
  'Tail syslog files, filter out debug messages, and forward to a remote Logstash via TCP',
  'Read from Filebeat, parse Apache combined log format with grok, and index into Elasticsearch',
]

export function PipelinePromptModal({ onClose }: { onClose: () => void }) {
  const { loadPipeline, addPipeline, logstashVersion } = useBuilderStore()

  // API keys (live-edit, saved to localStorage on generate)
  const [jinaKey, setJinaKeyState] = useState(getJinaKey)
  const [anthropicKey, setAnthropicKeyState] = useState(getAnthropicKey)

  // Prompt & generation state
  const [prompt, setPrompt] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<GenerationResult | null>(null)

  // Apply mode
  const [applyMode, setApplyMode] = useState<ApplyMode>('replace')

  // Cache-cleared banner (auto-hides after 3 s)
  const [cacheCleared, setCacheCleared] = useState(false)
  const cacheClearedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleClearCache = useCallback(() => {
    clearEmbeddingCache()
    setCacheCleared(true)
    if (cacheClearedTimerRef.current) clearTimeout(cacheClearedTimerRef.current)
    cacheClearedTimerRef.current = setTimeout(() => setCacheCleared(false), 3000)
  }, [])

  const abortRef = useRef(false)

  const keysSet = jinaKey.trim().length > 0 && anthropicKey.trim().length > 0

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!keysSet || !prompt.trim()) return
    setJinaKey(jinaKey.trim())
    setAnthropicKey(anthropicKey.trim())
    setStep('running')
    setError('')
    setResult(null)
    abortRef.current = false

    try {
      const gen = await generatePipelineFromPrompt({
        userPrompt: prompt.trim(),
        jinaApiKey: jinaKey.trim(),
        anthropicApiKey: anthropicKey.trim(),
        logstashVersion,
        onProgress: msg => { if (!abortRef.current) setProgressMsg(msg) },
      })
      if (!abortRef.current) {
        setResult(gen)
        setStep('done')
      }
    } catch (e) {
      if (!abortRef.current) {
        setError(e instanceof Error ? e.message : String(e))
        setStep('error')
      }
    }
  }

  // ── Apply ───────────────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!result) return
    const { parseResult } = result
    const pipeline = {
      id: '',
      name: applyMode === 'new-tab' ? `AI: ${prompt.slice(0, 40)}` : '',
      inputs: parseResult.inputs.map(toInstance),
      filters: parseResult.filters.map(toInstance),
      outputs: parseResult.outputs.map(toInstance),
      settings: { ...DEFAULT_PIPELINE_SETTINGS },
    }
    if (applyMode === 'new-tab') {
      addPipeline()
      // addPipeline creates a new pipeline and makes it active; overwrite it
      loadPipeline(pipeline)
    } else {
      loadPipeline(pipeline)
    }
    onClose()
  }

  // ── Section counts ──────────────────────────────────────────────────────────
  const pluginsBySection: Record<string, string[]> = { input: [], filter: [], output: [] }
  if (result) {
    result.selectedPlugins.forEach(p => {
      if (pluginsBySection[p.section]) pluginsBySection[p.section].push(p.id)
    })
  }

  const sectionColor: Record<string, 'success' | 'primary' | 'warning'> = {
    input: 'success',
    filter: 'primary',
    output: 'warning',
  }

  return (
    <EuiModal onClose={onClose} style={{ width: 700, maxWidth: '95vw' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sparkles" size="l" color="accent" />
            </EuiFlexItem>
            <EuiFlexItem>Build pipeline with AI</EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {/* ── API Keys accordion ── */}
        <EuiAccordion
          id="ai-keys"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={keysSet ? 'checkInCircleFilled' : 'key'} color={keysSet ? 'success' : 'warning'} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{keysSet ? 'API keys configured' : 'Set API keys to get started'}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          initialIsOpen={!keysSet}
          paddingSize="s"
        >
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem>
              <EuiFormRow
                label="Jina AI API key"
                helpText={<a href="https://jina.ai" target="_blank" rel="noreferrer">Get a key at jina.ai</a>}
              >
                <EuiFieldPassword
                  compressed
                  placeholder="jina_…"
                  value={jinaKey}
                  onChange={e => setJinaKeyState(e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label="Anthropic API key"
                helpText={<><a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a> — set a spending limit on your key to cap blast radius</>}
              >
                <EuiFieldPassword
                  compressed
                  placeholder="sk-ant-…"
                  value={anthropicKey}
                  onChange={e => setAnthropicKeyState(e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            Keys are saved to <strong>sessionStorage</strong> (cleared when you close this tab) and never leave your machine.{' '}
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={handleClearCache}
            >
              Clear embedding cache
            </EuiButtonEmpty>
          </EuiText>
        </EuiAccordion>

        {cacheCleared && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut color="success" iconType="check" size="s" title="Embedding cache cleared — next generation will re-index the plugin catalog." />
          </>
        )}

        <EuiSpacer size="m" />

        {/* ── Prompt input ── */}
        <EuiFormRow
          label="Describe your pipeline"
          helpText="Be as specific as you like — mention the log format, source, filters, and destination."
          fullWidth
        >
          <EuiTextArea
            fullWidth
            rows={4}
            value={prompt}
            onChange={e => { setPrompt(e.target.value.slice(0, 2000)); if (step === 'error') setStep('idle') }}
            placeholder="e.g. Read nginx access logs from /var/log/nginx/access.log, parse them with grok, add geo enrichment for client_ip, and send to Elasticsearch at localhost:9200"
            disabled={step === 'running'}
          />
        </EuiFormRow>
        {prompt.length > 1800 && (
          <EuiText size="xs" color={prompt.length >= 2000 ? 'danger' : 'subdued'} style={{ marginTop: -8, marginBottom: 4 }}>
            {prompt.length} / 2000 characters
          </EuiText>
        )}

        {/* Example prompts */}
        {prompt === '' && step === 'idle' && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">Try an example:</EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup wrap gutterSize="xs">
              {EXAMPLE_PROMPTS.map(ex => (
                <EuiFlexItem grow={false} key={ex}>
                  <EuiButton
                    size="s"
                    color="text"
                    onClick={() => setPrompt(ex)}
                    style={{ fontSize: 11 }}
                  >
                    {ex.length > 55 ? ex.slice(0, 55) + '…' : ex}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        {/* ── Running state ── */}
        {step === 'running' && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut color="primary" iconType="none">
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}><EuiLoadingSpinner size="m" /></EuiFlexItem>
                <EuiFlexItem><EuiText size="s">{progressMsg || 'Starting…'}</EuiText></EuiFlexItem>
              </EuiFlexGroup>
            </EuiCallOut>
          </>
        )}

        {/* ── Error state ── */}
        {step === 'error' && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut color="danger" title="Generation failed" iconType="alert">
              <EuiText size="s">{error}</EuiText>
            </EuiCallOut>
          </>
        )}

        {/* ── Done: result preview ── */}
        {step === 'done' && result && (
          <>
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
            <EuiSpacer size="m" />

            {/* Plugin badges */}
            <EuiText size="xs" color="subdued"><strong>Plugins selected by Jina:</strong></EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup wrap gutterSize="xs">
              {(['input', 'filter', 'output'] as const).map(sec =>
                pluginsBySection[sec].map(id => (
                  <EuiFlexItem grow={false} key={`${sec}-${id}`}>
                    <EuiBadge color={sectionColor[sec]}>{sec}: {id}</EuiBadge>
                  </EuiFlexItem>
                ))
              )}
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {/* Parse summary */}
            <EuiFlexGroup gutterSize="m" responsive={false}>
              {[
                { label: 'Inputs', count: result.parseResult.inputs.length, color: 'success' as const },
                { label: 'Filters', count: result.parseResult.filters.length, color: 'primary' as const },
                { label: 'Outputs', count: result.parseResult.outputs.length, color: 'warning' as const },
              ].map(({ label, count, color }) => (
                <EuiFlexItem grow={false} key={label}>
                  <EuiBadge color={count > 0 ? color : 'default'}>
                    {count} {label}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>

            {result.parseResult.warnings.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut color="warning" iconType="warning" title="Parser warnings" size="s">
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {result.parseResult.warnings.map((w, i) => <li key={i}><EuiText size="xs">{w}</EuiText></li>)}
                  </ul>
                </EuiCallOut>
              </>
            )}

            <EuiSpacer size="m" />

            {/* Generated config preview */}
            <EuiText size="xs" color="subdued"><strong>Generated logstash.conf:</strong></EuiText>
            <EuiSpacer size="xs" />
            <EuiCodeBlock
              language="ruby"
              fontSize="s"
              isCopyable
              overflowHeight={260}
            >
              {result.confText}
            </EuiCodeBlock>

            {/* Apply mode selector */}
            <EuiSpacer size="m" />
            <EuiFormRow label="Apply to">
              <EuiButtonGroup
                legend="Apply mode"
                idSelected={applyMode}
                onChange={id => setApplyMode(id as ApplyMode)}
                options={[
                  { id: 'replace', label: 'Current pipeline tab' },
                  { id: 'new-tab', label: 'New pipeline tab' },
                ]}
              />
            </EuiFormRow>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
            {step === 'done' && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="refresh"
                  onClick={() => { setStep('idle'); setResult(null) }}
                >
                  Regenerate
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {step !== 'done' ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="sparkles"
                  isLoading={step === 'running'}
                  isDisabled={!keysSet || !prompt.trim() || step === 'running'}
                  onClick={handleGenerate}
                >
                  Generate pipeline
                </EuiButton>
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <EuiButton fill iconType="check" onClick={handleApply}>
                  Apply to canvas
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  )
}

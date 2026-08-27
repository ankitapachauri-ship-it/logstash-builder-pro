import { useState } from 'react'
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
} from '@elastic/eui'
import { useBuilderStore, DEFAULT_PIPELINE_SETTINGS } from '../../store/useBuilderStore'
import { parseLogstashConfig } from '../../lib/logstash-parser'
import type { PluginInstance } from '../../lib/logstash-generator'

export function ImportModal() {
  const { showImport, setShowImport, loadPipeline, logstashVersion } = useBuilderStore()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!showImport) return null

  const toInstance = (p: { pluginId: string; values: Record<string, unknown>; condition?: string }): PluginInstance => ({
    id: crypto.randomUUID(),
    pluginId: p.pluginId,
    values: p.values,
    secretKeystore: {},
    shownOptional: [],
    condition: p.condition,
  })

  const handleImport = () => {
    setError(null)
    try {
      const result = parseLogstashConfig(text, logstashVersion)
      loadPipeline({
        id: '',
        name: '',
        inputs: result.inputs.map(toInstance),
        filters: result.filters.map(toInstance),
        outputs: result.outputs.map(toInstance),
        settings: { ...DEFAULT_PIPELINE_SETTINGS },
      })
      setShowImport(false)
      setText('')
    } catch (e) {
      setError(`Parse error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <EuiModal onClose={() => setShowImport(false)} style={{ width: 640 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Import logstash.conf</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>Paste an existing Logstash configuration to import it into the canvas.</p>
        </EuiText>
        <EuiSpacer size="s" />
        {error && (
          <>
            <EuiCallOut color="danger" iconType="alert" title="Parse error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFormRow label="Logstash config" fullWidth>
          <EuiTextArea
            value={text}
            onChange={e => { setText(e.target.value); setError(null) }}
            rows={16}
            fullWidth
            placeholder={`input {\n  beats { port => 5044 }\n}\nfilter {\n  grok { ... }\n}\noutput {\n  elasticsearch { hosts => ["localhost:9200"] }\n}`}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={() => { setShowImport(false); setText(''); setError(null) }}>Cancel</EuiButtonEmpty>
        <EuiButton fill onClick={handleImport} disabled={!text.trim()}>
          Import
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  )
}

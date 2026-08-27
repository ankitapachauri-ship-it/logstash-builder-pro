import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiText,
  EuiSpacer,
  EuiHorizontalRule,
  EuiCallOut,
  EuiCode,
} from '@elastic/eui'
import { useBuilderStore, useActivePipeline, DEFAULT_PIPELINE_SETTINGS } from '../../store/useBuilderStore'
import type { PipelineSettings } from '../../store/useBuilderStore'

export function PipelineSettingsModal({ onClose }: { onClose: () => void }) {
  const { updatePipelineSettings } = useBuilderStore()
  const pipeline = useActivePipeline()
  const settings: PipelineSettings = { ...DEFAULT_PIPELINE_SETTINGS, ...pipeline.settings }

  const update = (patch: Partial<PipelineSettings>) =>
    updatePipelineSettings(pipeline.id, patch)

  return (
    <EuiModal onClose={onClose} style={{ width: 540 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          Pipeline Settings — <strong>{pipeline.name}</strong>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            These settings are written to <EuiCode>pipelines.yml</EuiCode> when you download or preview.
            They control how Logstash executes this pipeline.
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiForm>
          {/* Throughput */}
          <EuiText size="xs" color="subdued"><strong>Throughput</strong></EuiText>
          <EuiSpacer size="s" />

          <EuiFormRow
            label="Workers"
            helpText="Number of parallel worker threads (pipeline.workers). Default: number of CPU cores."
          >
            <EuiFieldNumber
              value={settings.workers}
              min={1}
              max={64}
              onChange={e => update({ workers: Number(e.target.value) || 1 })}
              compressed
            />
          </EuiFormRow>

          <EuiFormRow
            label="Batch size"
            helpText="Max events collected before sending to filters/outputs (pipeline.batch.size). Default: 125."
          >
            <EuiFieldNumber
              value={settings.batchSize}
              min={1}
              max={10000}
              onChange={e => update({ batchSize: Number(e.target.value) || 1 })}
              compressed
            />
          </EuiFormRow>

          <EuiFormRow
            label="Batch delay (ms)"
            helpText="Wait time in ms for batch collection before dispatch (pipeline.batch.delay). Default: 50."
          >
            <EuiFieldNumber
              value={settings.batchDelay}
              min={0}
              max={5000}
              onChange={e => update({ batchDelay: Number(e.target.value) })}
              compressed
            />
          </EuiFormRow>

          <EuiHorizontalRule margin="m" />

          {/* Ordering & Queue */}
          <EuiText size="xs" color="subdued"><strong>Ordering &amp; Queue</strong></EuiText>
          <EuiSpacer size="s" />

          <EuiFormRow
            label="Event ordering"
            helpText="Controls whether event order is preserved (pipeline.ordered). auto = enabled when workers=1."
          >
            <EuiSelect
              compressed
              value={settings.ordered}
              onChange={e => update({ ordered: e.target.value as PipelineSettings['ordered'] })}
              options={[
                { value: 'auto', text: 'auto (default)' },
                { value: 'true', text: 'true — always ordered' },
                { value: 'false', text: 'false — best throughput' },
              ]}
            />
          </EuiFormRow>

          <EuiFormRow
            label="Queue type"
            helpText="Memory queue is faster; persisted survives restarts (queue.type)."
          >
            <EuiSelect
              compressed
              value={settings.queueType}
              onChange={e => update({ queueType: e.target.value as PipelineSettings['queueType'] })}
              options={[
                { value: 'memory', text: 'memory (default)' },
                { value: 'persisted', text: 'persisted (disk-backed)' },
              ]}
            />
          </EuiFormRow>
        </EuiForm>

        <EuiSpacer size="m" />

        <EuiCallOut
          title="Tip"
          color="primary"
          iconType="iInCircle"
          size="s"
        >
          <EuiText size="xs">
            <p>
              For I/O-heavy pipelines (Elasticsearch, Kafka) increase <strong>workers</strong> to match available CPU cores.
              For ordered processing set workers to <strong>1</strong> and ordering to <strong>true</strong>.
            </p>
          </EuiText>
        </EuiCallOut>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
        <EuiButton fill onClick={onClose}>Done</EuiButton>
      </EuiModalFooter>
    </EuiModal>
  )
}

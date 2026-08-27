import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiFlexGrid,
  EuiCard,
  EuiText,
} from '@elastic/eui'
import { useBuilderStore, DEFAULT_PIPELINE_SETTINGS } from '../../store/useBuilderStore'
import type { Pipeline } from '../../store/useBuilderStore'

interface Template {
  name: string
  description: string
  icon: string
  pipeline: Omit<Pipeline, 'id' | 'name' | 'settings'>
}

const TEMPLATES: Template[] = [
  {
    name: 'Beats → Elasticsearch',
    description: 'Receive events from Filebeat/Metricbeat and index them into Elasticsearch.',
    icon: 'logoBeats',
    pipeline: {
      inputs: [{ id: '1', pluginId: 'beats', values: { port: 5044 }, secretKeystore: {} }],
      filters: [{ id: '2', pluginId: 'mutate', values: {}, secretKeystore: {} }],
      outputs: [{ id: '3', pluginId: 'elasticsearch', values: { hosts: ['localhost:9200'] }, secretKeystore: {} }],
    },
  },
  {
    name: 'Apache Log Parser',
    description: 'Parse Apache/Nginx access logs with Grok and send to Elasticsearch.',
    icon: 'logoNginx',
    pipeline: {
      inputs: [{ id: '1', pluginId: 'file', values: { path: ['/var/log/apache2/access.log'] }, secretKeystore: {} }],
      filters: [
        { id: '2', pluginId: 'grok', values: { match: '%{COMBINEDAPACHELOG}' }, secretKeystore: {} },
        { id: '3', pluginId: 'date', values: { match: 'timestamp' }, secretKeystore: {} },
      ],
      outputs: [{ id: '4', pluginId: 'elasticsearch', values: { hosts: ['localhost:9200'] }, secretKeystore: {} }],
    },
  },
  {
    name: 'Syslog → S3',
    description: 'Collect syslog events and archive them to Amazon S3.',
    icon: 'logoAWS',
    pipeline: {
      inputs: [{ id: '1', pluginId: 'syslog', values: { port: 514 }, secretKeystore: {} }],
      filters: [{ id: '2', pluginId: 'mutate', values: {}, secretKeystore: {} }],
      outputs: [{ id: '3', pluginId: 's3', values: { bucket: 'my-logs-bucket' }, secretKeystore: {} }],
    },
  },
  {
    name: 'JDBC → Elasticsearch',
    description: 'Poll a database via JDBC and sync records to Elasticsearch.',
    icon: 'storage',
    pipeline: {
      inputs: [{ id: '1', pluginId: 'jdbc', values: {}, secretKeystore: {} }],
      filters: [{ id: '2', pluginId: 'mutate', values: {}, secretKeystore: {} }],
      outputs: [{ id: '3', pluginId: 'elasticsearch', values: { hosts: ['localhost:9200'] }, secretKeystore: {} }],
    },
  },
  {
    name: 'Kafka Consumer',
    description: 'Consume events from Kafka topics and route to Elasticsearch.',
    icon: 'logoKafka',
    pipeline: {
      inputs: [{ id: '1', pluginId: 'kafka', values: { topics: ['my-topic'] }, secretKeystore: {} }],
      filters: [{ id: '2', pluginId: 'json', values: { source: 'message' }, secretKeystore: {} }],
      outputs: [{ id: '3', pluginId: 'elasticsearch', values: { hosts: ['localhost:9200'] }, secretKeystore: {} }],
    },
  },
  {
    name: 'HTTP Poller',
    description: 'Poll an HTTP endpoint and index the JSON response.',
    icon: 'globe',
    pipeline: {
      inputs: [{ id: '1', pluginId: 'http_poller', values: {}, secretKeystore: {} }],
      filters: [{ id: '2', pluginId: 'json', values: { source: 'message' }, secretKeystore: {} }],
      outputs: [{ id: '3', pluginId: 'elasticsearch', values: { hosts: ['localhost:9200'] }, secretKeystore: {} }],
    },
  },
]

export function TemplatesModal() {
  const { showTemplates, setShowTemplates, loadPipeline } = useBuilderStore()

  if (!showTemplates) return null

  const apply = (tpl: Template) => {
    loadPipeline({ id: '', name: '', settings: { ...DEFAULT_PIPELINE_SETTINGS }, ...tpl.pipeline })
    setShowTemplates(false)
  }

  return (
    <EuiModal onClose={() => setShowTemplates(false)} style={{ width: 760 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Pipeline Templates</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText color="subdued" size="s">
          <p>Start with a pre-built pipeline. You can customise it after loading.</p>
        </EuiText>
        <EuiFlexGrid columns={2} gutterSize="m" style={{ marginTop: 16 }}>
          {TEMPLATES.map(tpl => (
            <EuiCard
              key={tpl.name}
              icon={<span />}
              title={tpl.name}
              description={tpl.description}
              onClick={() => apply(tpl)}
              hasBorder
            />
          ))}
        </EuiFlexGrid>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={() => setShowTemplates(false)}>Cancel</EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  )
}

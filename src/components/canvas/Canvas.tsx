import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  EuiText,
  EuiEmptyPrompt,
  EuiButtonEmpty,
} from '@elastic/eui'
import { PluginNode, type PluginNodeData } from './PluginNode'
import { useActivePipeline, useBuilderStore } from '../../store/useBuilderStore'
import type { Section } from '../../lib/logstash-plugins'
import { findPlugin } from '../../lib/logstash-plugins'

const nodeTypes = { pluginNode: PluginNode }

const COLUMN_X: Record<Section, number> = {
  input:  60,
  filter: 310,
  output: 560,
}
const ROW_GAP = 120

function validateInstance(
  pluginId: string,
  section: Section,
  values: Record<string, unknown>,
  version: string,
): boolean {
  const def = findPlugin(section, pluginId, version)
  if (!def) return false
  return def.fields.filter(f => f.required).every(f => {
    const v = values[f.key]
    return v !== undefined && v !== null && v !== ''
  })
}

export function Canvas() {
  const pipeline = useActivePipeline()
  const { selectedInstanceId, logstashVersion, setShowTemplates } = useBuilderStore()

  const nodes = useMemo<Node[]>(() => {
    const result: Node[] = []
    const sections: Section[] = ['input', 'filter', 'output']
    sections.forEach(section => {
      pipeline[`${section}s`].forEach((inst, idx) => {
        const isValid = validateInstance(inst.pluginId, section, inst.values, logstashVersion)
        const data: PluginNodeData = {
          instanceId: inst.id,
          pluginId: inst.pluginId,
          section,
          selected: selectedInstanceId === inst.id,
          hasError: !isValid,
          condition: inst.condition,
        }
        result.push({
          id: inst.id,
          type: 'pluginNode',
          position: { x: COLUMN_X[section], y: 60 + idx * ROW_GAP },
          data: data as unknown as Record<string, unknown>,
          draggable: true,
        })
      })
    })
    return result
  }, [pipeline, selectedInstanceId, logstashVersion])

  const edges = useMemo<Edge[]>(() => {
    const result: Edge[] = []
    const { inputs, filters, outputs } = pipeline

    const edgeBase: Partial<Edge> = {
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#0B64DD', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: '#0B64DD',
      },
    }

    inputs.forEach(inp => {
      if (filters.length > 0) {
        filters.forEach(f => {
          result.push({ ...edgeBase, id: `${inp.id}-${f.id}`, source: inp.id, target: f.id } as Edge)
        })
      } else {
        outputs.forEach(out => {
          result.push({ ...edgeBase, id: `${inp.id}-${out.id}`, source: inp.id, target: out.id } as Edge)
        })
      }
    })

    if (filters.length > 0) {
      filters.forEach(f => {
        outputs.forEach(out => {
          result.push({ ...edgeBase, id: `${f.id}-${out.id}`, source: f.id, target: out.id } as Edge)
        })
      })
    }

    return result
  }, [pipeline])

  const isEmpty = !pipeline.inputs.length && !pipeline.filters.length && !pipeline.outputs.length

  if (isEmpty) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EuiEmptyPrompt
          iconType="logoLogstash"
          title={<h2>Start building your pipeline</h2>}
          body={
            <EuiText>
              <p>Use the <strong>Add plugin</strong> buttons above to add inputs, filters, and outputs — or start from a template.</p>
            </EuiText>
          }
          actions={
            <EuiButtonEmpty iconType="document" onClick={() => setShowTemplates(true)}>
              Browse templates
            </EuiButtonEmpty>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 40, y: 40, zoom: 1 }}
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--euiColorLightShade)" />
        <Controls />
      </ReactFlow>
    </div>
  )
}

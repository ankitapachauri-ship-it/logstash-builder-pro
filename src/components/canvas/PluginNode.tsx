import { memo } from 'react'
import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  EuiPanel,
  EuiBadge,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiHealth,
} from '@elastic/eui'
import type { Section } from '../../lib/logstash-plugins'
import { useBuilderStore } from '../../store/useBuilderStore'

export interface PluginNodeData {
  instanceId: string
  pluginId: string
  section: Section
  selected: boolean
  hasError: boolean
  condition?: string
}

const SECTION_COLORS: Record<Section, string> = {
  input: 'success',
  filter: 'primary',
  output: 'accent',
}

const SECTION_LABELS: Record<Section, string> = {
  input: 'INPUT',
  filter: 'FILTER',
  output: 'OUTPUT',
}

function PluginNodeInner({ data }: NodeProps) {
  const nodeData = data as unknown as PluginNodeData
  const { instanceId, pluginId, section, hasError, condition } = nodeData

  const { selectInstance, selectedInstanceId, removePlugin } = useBuilderStore()
  const isSelected = selectedInstanceId === instanceId

  return (
    <div>
      {section !== 'input' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: 'var(--euiColorPrimary)', width: 10, height: 10 }}
        />
      )}

      <EuiPanel
        paddingSize="s"
        hasShadow={isSelected}
        hasBorder
        style={{
          minWidth: 180,
          cursor: 'pointer',
          borderColor: isSelected ? 'var(--euiColorPrimary)' : undefined,
          borderWidth: isSelected ? 2 : 1,
        }}
        onClick={() => selectInstance(instanceId)}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={SECTION_COLORS[section]} style={{ fontSize: 10 }}>
              {SECTION_LABELS[section]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong style={{ fontFamily: 'monospace' }}>{pluginId}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {hasError ? (
              <EuiHealth color="danger" style={{ margin: 0 }} />
            ) : (
              <EuiHealth color="success" style={{ margin: 0 }} />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              color="danger"
              aria-label={`Remove ${pluginId}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                removePlugin(section, instanceId)
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {condition && (
          <EuiText size="xs" color="subdued" style={{ marginTop: 4, fontFamily: 'monospace' }}>
            if {condition}
          </EuiText>
        )}
      </EuiPanel>

      {section !== 'output' && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: 'var(--euiColorPrimary)', width: 10, height: 10 }}
        />
      )}
    </div>
  )
}

export const PluginNode = memo(PluginNodeInner)

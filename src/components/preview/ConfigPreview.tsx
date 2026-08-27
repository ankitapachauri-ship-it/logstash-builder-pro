import { useMemo, useState } from 'react'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCallOut,
  EuiSpacer,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui'
import { generateConfig } from '../../lib/logstash-generator'
import { useActivePipeline, useBuilderStore } from '../../store/useBuilderStore'

export function ConfigPreview() {
  const pipeline = useActivePipeline()
  const { logstashVersion } = useBuilderStore()
  const [collapsed, setCollapsed] = useState(false)

  const { config, warnings, keystoreVars } = useMemo(() => {
    try {
      const result = generateConfig(
        { pipelineName: pipeline.name, inputs: pipeline.inputs, filters: pipeline.filters, outputs: pipeline.outputs },
        logstashVersion
      )
      return {
        config: result.config,
        warnings: result.plaintextSecretWarnings ?? [],
        keystoreVars: result.keystoreVars ?? [],
      }
    } catch {
      return { config: '# Error generating config', warnings: [] as string[], keystoreVars: [] as string[] }
    }
  }, [pipeline, logstashVersion])

  const handleDownload = () => {
    const blob = new Blob([config], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${pipeline.name.toLowerCase().replace(/\s+/g, '-')}.conf`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(config)
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--euiBorderColor)',
        background: 'var(--euiPageBackgroundColor)',
        transition: 'height 0.2s',
        height: collapsed ? 40 : 260,
        minHeight: collapsed ? 40 : 260,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header bar */}
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        style={{ padding: '4px 12px', borderBottom: collapsed ? 'none' : '1px solid var(--euiBorderColor)', flexShrink: 0 }}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={collapsed ? 'arrowUp' : 'arrowDown'}
            size="xs"
            color="text"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand preview' : 'Collapse preview'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs"><strong>logstash.conf preview</strong></EuiText>
        </EuiFlexItem>
        {!collapsed && (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Copy to clipboard">
                <EuiButtonEmpty iconType="copyClipboard" size="xs" onClick={handleCopy}>Copy</EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="download" size="xs" onClick={handleDownload}>Download .conf</EuiButtonEmpty>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          {warnings.length > 0 && (
            <>
              <EuiCallOut
                size="s"
                color="warning"
                iconType="warning"
                title={`${warnings.length} field(s) contain plaintext secrets`}
              >
                <EuiText size="xs">
                  Consider moving to keystore: {warnings.join(', ')}
                </EuiText>
              </EuiCallOut>
              <EuiSpacer size="xs" />
            </>
          )}
          {keystoreVars.length > 0 && (
            <>
              <EuiCallOut
                size="s"
                color="primary"
                iconType="lock"
                title="Keystore variables used"
              >
                <EuiText size="xs">
                  Add these to your keystore: {keystoreVars.join(', ')}
                </EuiText>
              </EuiCallOut>
              <EuiSpacer size="xs" />
            </>
          )}
          <EuiCodeBlock language="ruby" fontSize="s" paddingSize="s" isCopyable={false} overflowHeight={160}>
            {config}
          </EuiCodeBlock>
        </div>
      )}
    </div>
  )
}

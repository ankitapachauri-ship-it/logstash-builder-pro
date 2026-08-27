import { useState, useMemo } from 'react'
import {
  EuiPanel,
  EuiFieldSearch,
  EuiSpacer,
  EuiText,
  EuiListGroup,
  EuiListGroupItem,
  EuiButtonIcon,
  EuiTitle,
  EuiHorizontalRule,
  EuiToolTip,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui'
import { PLUGINS } from '../../lib/logstash-plugins'
import type { Section } from '../../lib/logstash-plugins'
import { useBuilderStore } from '../../store/useBuilderStore'
import { versionInRange } from '../../lib/logstash-versions'

const SECTION_COLORS: Record<Section, 'success' | 'primary' | 'accent'> = {
  input: 'success',
  filter: 'primary',
  output: 'accent',
}

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'input', label: 'Inputs' },
  { key: 'filter', label: 'Filters' },
  { key: 'output', label: 'Outputs' },
]

export function PluginPalette() {
  const [query, setQuery] = useState('')
  const { addPlugin, logstashVersion } = useBuilderStore()

  const filteredSections = useMemo(() => {
    const q = query.toLowerCase().trim()
    return SECTIONS.map(({ key, label }) => ({
      key,
      label,
      plugins: PLUGINS[key].filter(p =>
        versionInRange(logstashVersion, p.since, p.until) &&
        (q === '' || p.id.toLowerCase().includes(q) || p.label.toLowerCase().includes(q))
      ),
    }))
  }, [query, logstashVersion])

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      style={{
        width: 240,
        height: '100%',
        overflowY: 'auto',
        borderRight: '1px solid var(--euiBorderColor)',
        borderRadius: 0,
      }}
      paddingSize="s"
    >
      <EuiTitle size="xs">
        <h3>Plugins</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFieldSearch
        placeholder="Search plugins…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        compressed
        fullWidth
        isClearable
      />
      <EuiSpacer size="s" />

      {filteredSections.map(({ key, label, plugins }) => (
        <div key={key}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={SECTION_COLORS[key]}>{label}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">{plugins.length}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />

          {plugins.length === 0 ? (
            <EuiText size="xs" color="subdued" style={{ paddingLeft: 4 }}>
              No plugins match
            </EuiText>
          ) : (
            <EuiListGroup maxWidth={false}>
              {plugins.map(plugin => (
                <EuiListGroupItem
                  key={plugin.id}
                  label={
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem>
                        <EuiText size="xs" style={{ fontFamily: 'monospace' }}>
                          {plugin.id}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={`Add ${plugin.id} ${key}`}>
                          <EuiButtonIcon
                            iconType="plusInCircle"
                            size="xs"
                            color={SECTION_COLORS[key]}
                            aria-label={`Add ${plugin.id}`}
                            onClick={() => addPlugin(key, plugin.id)}
                          />
                        </EuiToolTip>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  style={{ cursor: 'default' }}
                />
              ))}
            </EuiListGroup>
          )}
          <EuiHorizontalRule margin="s" />
        </div>
      ))}
    </EuiPanel>
  )
}

import { useState, useMemo } from 'react'
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
  EuiSpacer,
} from '@elastic/eui'
import { PLUGINS } from '../../lib/logstash-plugins'
import type { Section } from '../../lib/logstash-plugins'
import { versionInRange } from '../../lib/logstash-versions'
import { useBuilderStore } from '../../store/useBuilderStore'

const SECTIONS: { key: Section; label: string; color: 'success' | 'primary' | 'accent'; icon: string }[] = [
  { key: 'input',  label: 'Add Input',  color: 'success', icon: 'plusInCircle' },
  { key: 'filter', label: 'Add Filter', color: 'primary', icon: 'plusInCircle' },
  { key: 'output', label: 'Add Output', color: 'accent',  icon: 'plusInCircle' },
]

function SectionDropdown({
  section,
  label,
  color,
}: {
  section: Section
  label: string
  color: 'success' | 'primary' | 'accent'
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { addPlugin, logstashVersion } = useBuilderStore()

  const plugins = useMemo(() => {
    const q = query.toLowerCase().trim()
    return PLUGINS[section].filter(
      p =>
        versionInRange(logstashVersion, p.since, p.until) &&
        (q === '' || p.id.toLowerCase().includes(q))
    )
  }, [section, query, logstashVersion])

  const handleAdd = (pluginId: string) => {
    addPlugin(section, pluginId)
    setOpen(false)
    setQuery('')
  }

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => { setOpen(false); setQuery('') }}
      button={
        <EuiButtonEmpty
          iconType="arrowDown"
          iconSide="right"
          size="s"
          color={color}
          onClick={() => setOpen(o => !o)}
        >
          {label}
        </EuiButtonEmpty>
      }
      panelPaddingSize="s"
      anchorPosition="downLeft"
      panelStyle={{ width: 260, maxHeight: 360, overflowY: 'auto' }}
    >
      <EuiFieldSearch
        placeholder={`Search ${section}s…`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        compressed
        fullWidth
        autoFocus
        isClearable
      />
      <EuiSpacer size="xs" />
      {plugins.length === 0 ? (
        <EuiText size="xs" color="subdued" style={{ padding: '4px 8px' }}>
          No plugins match
        </EuiText>
      ) : (
        <EuiListGroup maxWidth={false}>
          {plugins.map(p => (
            <EuiListGroupItem
              key={p.id}
              label={
                <span style={{ fontFamily: "'Roboto Mono', 'SF Mono', monospace", fontSize: 13 }}>
                  {p.id}
                </span>
              }
              onClick={() => handleAdd(p.id)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </EuiListGroup>
      )}
    </EuiPopover>
  )
}

export function AddPluginBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 16px',
      borderBottom: '1px solid var(--euiBorderColor)',
      background: 'var(--euiPageBackgroundColor)',
    }}>
      <EuiText size="xs" color="subdued" style={{ marginRight: 8 }}>
        <strong>Add plugin:</strong>
      </EuiText>
      {SECTIONS.map(s => (
        <SectionDropdown key={s.key} section={s.key} label={s.label} color={s.color} />
      ))}
    </div>
  )
}

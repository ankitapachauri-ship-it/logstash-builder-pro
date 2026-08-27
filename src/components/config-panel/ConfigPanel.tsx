import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch,
  EuiTextArea,
  EuiComboBox,
  EuiButtonIcon,
  EuiToolTip,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiCode,
} from '@elastic/eui'
import { useBuilderStore, useActivePipeline } from '../../store/useBuilderStore'
import { findPlugin } from '../../lib/logstash-plugins'
import type { Section, FieldDef } from '../../lib/logstash-plugins'
import type { PluginInstance } from '../../lib/logstash-generator'

function findInstanceAndSection(
  pipeline: ReturnType<typeof useActivePipeline>,
  instanceId: string
): { instance: PluginInstance; section: Section } | null {
  for (const section of ['input', 'filter', 'output'] as Section[]) {
    const inst = pipeline[`${section}s`].find(i => i.id === instanceId)
    if (inst) return { instance: inst, section }
  }
  return null
}

function FieldControl({
  field,
  value,
  isSecret,
  onChange,
  onToggleSecret,
}: {
  field: FieldDef
  value: unknown
  isSecret: boolean
  onChange: (v: unknown) => void
  onToggleSecret: () => void
}) {
  const strVal = value != null ? String(value) : ''

  const secretToggle = (
    <EuiToolTip content={isSecret ? 'Using keystore variable' : 'Mark as secret (use keystore)'}>
      <EuiButtonIcon
        iconType={isSecret ? 'lock' : 'lockOpen'}
        size="xs"
        color={isSecret ? 'primary' : 'text'}
        onClick={onToggleSecret}
        aria-label="Toggle keystore"
      />
    </EuiToolTip>
  )

  if (field.type === 'boolean') {
    return (
      <EuiSwitch
        label={value ? 'true' : 'false'}
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
        compressed
      />
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <EuiSelect
        value={strVal}
        onChange={e => onChange(e.target.value)}
        options={[{ value: '', text: '— select —' }, ...field.options.map(o => ({ value: o, text: o }))]}
        compressed
      />
    )
  }

  if (field.type === 'number') {
    return (
      <EuiFieldNumber
        value={strVal}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
        compressed
      />
    )
  }

  if (field.type === 'array') {
    const arr: string[] = Array.isArray(value)
      ? (value as string[])
      : strVal ? strVal.split(',').map(s => s.trim()).filter(Boolean) : []
    return (
      <EuiComboBox
        noSuggestions
        selectedOptions={arr.map(v => ({ label: v }))}
        onChange={opts => onChange(opts.map(o => o.label))}
        onCreateOption={opt => onChange([...arr, opt])}
        compressed
      />
    )
  }

  if (field.type === 'textarea' || field.type === 'kvlines') {
    return (
      <EuiTextArea
        value={strVal}
        onChange={e => onChange(e.target.value)}
        compressed
        rows={3}
        resize="vertical"
        placeholder={field.placeholder}
      />
    )
  }

  // text / secret
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldText
          value={isSecret ? `\${${strVal || '…'}}` : strVal}
          readOnly={isSecret}
          onChange={e => onChange(e.target.value)}
          compressed
          placeholder={field.placeholder}
        />
      </EuiFlexItem>
      {(field.type === 'secret' || field.type === 'text') && (
        <EuiFlexItem grow={false}>{secretToggle}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
}

export function ConfigPanel() {
  const { selectedInstanceId, logstashVersion, updatePlugin, toggleSecret, setCondition, selectInstance } = useBuilderStore()
  const pipeline = useActivePipeline()

  if (!selectedInstanceId) return null

  const found = findInstanceAndSection(pipeline, selectedInstanceId)
  if (!found) return null
  const { instance, section } = found

  const pluginDef = findPlugin(section, instance.pluginId, logstashVersion)
  if (!pluginDef) return null

  const requiredFields = pluginDef.fields.filter(f => f.required)
  const optionalFields = pluginDef.fields.filter(f => !f.required)

  // Optional fields are hidden by default; revealed only after clicking the button
  // Once shown, they stay visible (persisted in shownOptional)
  const shownOptional = new Set(instance.shownOptional ?? [])

  const visibleOptional = optionalFields.filter(
    f => shownOptional.has(f.key) || instance.values[f.key] != null
  )
  const hiddenOptional = optionalFields.filter(
    f => !shownOptional.has(f.key) && instance.values[f.key] == null
  )

  return (
    <EuiPanel
      hasBorder
      hasShadow
      style={{
        width: 300,
        height: '100%',
        overflowY: 'auto',
        borderRadius: 0,
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
      }}
      paddingSize="m"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3 style={{ fontFamily: 'monospace' }}>{instance.pluginId}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={section === 'input' ? 'success' : section === 'filter' ? 'primary' : 'accent'}>
            {section.toUpperCase()}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="cross" size="xs" color="text" onClick={() => selectInstance(null)} aria-label="Close" />
        </EuiFlexItem>
      </EuiFlexGroup>

      {section !== 'input' && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiFormRow label="Condition (if guard)" helpText={<EuiText size="xs">e.g. <EuiCode>[type] == "nginx"</EuiCode></EuiText>}>
            <EuiFieldText
              value={instance.condition ?? ''}
              onChange={e => setCondition(section, instance.id, e.target.value)}
              placeholder="[field] == value"
              compressed
            />
          </EuiFormRow>
        </>
      )}

      <EuiHorizontalRule margin="s" />

      <EuiForm>
        {requiredFields.length > 0 && (
          <>
            <EuiText size="xs" color="subdued"><strong>Required</strong></EuiText>
            <EuiSpacer size="xs" />
            {requiredFields.map(field => (
              <EuiFormRow
                key={field.key}
                label={field.label || field.key}
                helpText={field.help}
                isInvalid={!instance.values[field.key]}
                error={!instance.values[field.key] ? 'Required' : undefined}
              >
                <FieldControl
                  field={field}
                  value={instance.values[field.key]}
                  isSecret={!!instance.secretKeystore[field.key]}
                  onChange={v => updatePlugin(section, instance.id, { [field.key]: v })}
                  onToggleSecret={() => toggleSecret(section, instance.id, field.key)}
                />
              </EuiFormRow>
            ))}
          </>
        )}

        {optionalFields.length > 0 && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued"><strong>Optional</strong></EuiText>
              </EuiFlexItem>
              {visibleOptional.length > 0 && hiddenOptional.length === 0 && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">{optionalFields.length} fields</EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="xs" />

            {visibleOptional.map(field => (
              <EuiFormRow key={field.key} label={field.label || field.key} helpText={field.help}>
                <FieldControl
                  field={field}
                  value={instance.values[field.key]}
                  isSecret={!!instance.secretKeystore[field.key]}
                  onChange={v => updatePlugin(section, instance.id, { [field.key]: v })}
                  onToggleSecret={() => toggleSecret(section, instance.id, field.key)}
                />
              </EuiFormRow>
            ))}

            {hiddenOptional.length > 0 && (
              <EuiButton
                size="s"
                iconType="plusInCircle"
                color="text"
                onClick={() => {
                  const next = hiddenOptional.map(f => f.key)
                  useBuilderStore.setState(s => ({
                    pipelines: s.pipelines.map(p =>
                      p.id === s.activePipelineId
                        ? {
                            ...p,
                            [`${section}s`]: (p[`${section}s` as keyof typeof p] as unknown as PluginInstance[]).map((i: PluginInstance) =>
                              i.id === instance.id
                                ? { ...i, shownOptional: [...(i.shownOptional ?? []), ...next] }
                                : i
                            ),
                          }
                        : p
                    ),
                  }))
                }}
              >
                + Show {hiddenOptional.length} optional field{hiddenOptional.length !== 1 ? 's' : ''}
              </EuiButton>
            )}
          </>
        )}
      </EuiForm>
    </EuiPanel>
  )
}

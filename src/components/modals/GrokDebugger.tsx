import { useState, useEffect } from 'react'
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCodeBlock,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiToolTip,
  EuiSwitch,
  EuiDescriptionList,
  EuiHorizontalRule,
} from '@elastic/eui'
import { useBuilderStore } from '../../store/useBuilderStore'
import { testGrokAsync, suggestGrok } from '../../lib/grok'
import type { GrokTestResult } from '../../lib/grok'

export function GrokDebugger() {
  const { showGrok, setShowGrok } = useBuilderStore()
  const [pattern, setPattern] = useState('')
  const [sample, setSample] = useState('')
  const [result, setResult] = useState<GrokTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [smartEscape, setSmartEscape] = useState(false)

  // Auto-suggest pattern when sample is filled and pattern is empty
  useEffect(() => {
    if (sample.trim() && !pattern.trim()) {
      setPattern(suggestGrok(sample, smartEscape))
      setResult(null)
    }
  }, [sample]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-suggest when smart-escape toggle changes (if there's already a sample)
  useEffect(() => {
    if (sample.trim()) {
      setPattern(suggestGrok(sample, smartEscape))
      setResult(null)
    }
  }, [smartEscape]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!showGrok) return null

  const run = async () => {
    setTesting(true)
    setResult(null)
    const r = await testGrokAsync(pattern, sample)
    setResult(r)
    setTesting(false)
  }

  const rerunSuggest = () => {
    if (sample.trim()) {
      setPattern(suggestGrok(sample, smartEscape))
      setResult(null)
    }
  }

  const isMatch = result?.status === 'match'
  const isError = result?.status === 'error'
  const isNoMatch = result?.status === 'nomatch'

  return (
    <EuiFlyout onClose={() => setShowGrok(false)} size="m" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m"><h2>Grok Debugger</h2></EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          label="Sample log line"
          helpText="Paste a real log line. A pattern will be auto-suggested once you fill this in."
          fullWidth
        >
          <EuiTextArea
            value={sample}
            onChange={e => { setSample(e.target.value); setResult(null) }}
            rows={3}
            fullWidth
            placeholder="55.3.244.1 GET /index.html 15824 0.043"
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow
              label="Grok pattern"
              helpText="Edit the pattern, or click Re-suggest to regenerate from the sample."
              fullWidth
            >
              <EuiFieldText
                value={pattern}
                onChange={e => { setPattern(e.target.value); setResult(null) }}
                placeholder="%{IP:client} %{WORD:method} %{URIPATHPARAM:request}"
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Regenerate pattern from sample">
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                onClick={rerunSuggest}
                disabled={!sample.trim()}
              >
                Re-suggest
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Smart escape"
              checked={smartEscape}
              onChange={e => setSmartEscape(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              Treats <code>[ ] ( ) | :</code> as literal delimiters — keeps brackets and colons out of captured field values
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiButton
          fill
          onClick={run}
          isLoading={testing}
          isDisabled={!pattern.trim() || !sample.trim() || testing}
          fullWidth
          iconType="play"
        >
          {testing ? 'Testing…' : 'Test Pattern'}
        </EuiButton>

        {result && (
          <>
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
            <EuiSpacer size="m" />

            {isMatch && (
              <>
                <EuiCallOut
                  color="success"
                  iconType="checkInCircleFilled"
                  title={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>Pattern matched</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="success">
                          {result.fields?.length ?? 0} field{result.fields?.length !== 1 ? 's' : ''} captured
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
                {result.fields && result.fields.length > 0 && (
                  <>
                    <EuiSpacer size="s" />
                    <EuiDescriptionList
                      type="column"
                      compressed
                      listItems={result.fields.map(({ name, value }) => ({
                        title: <EuiText size="s"><code>{name}</code></EuiText>,
                        description: (
                          <EuiCodeBlock language="text" fontSize="s" paddingSize="s" isCopyable>
                            {value}
                          </EuiCodeBlock>
                        ),
                      }))}
                    />
                  </>
                )}
              </>
            )}

            {isNoMatch && (
              <EuiCallOut
                color="danger"
                iconType="alert"
                title="Pattern did not match"
              >
                <EuiText size="s">
                  <p>
                    The pattern did not match the sample. Try clicking <strong>Re-suggest</strong> to
                    generate a new candidate, then refine it manually.
                  </p>
                </EuiText>
              </EuiCallOut>
            )}

            {isError && (
              <EuiCallOut
                color="danger"
                iconType="alert"
                title="Pattern error"
              >
                <EuiText size="s"><p>{result.message}</p></EuiText>
              </EuiCallOut>
            )}
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  )
}

import { useEuiTheme } from '@elastic/eui'
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui'
import { useBuilderStore } from '../../store/useBuilderStore'

interface HomePageProps {
  onGetStarted: () => void
  onBrowseTemplates: () => void
  onAIBuild: () => void
}

const PIPELINE = [
  { label: 'beats',         section: 'input',  colorKey: 'success' as const, delay: '0s'   },
  { label: 'grok',          section: 'filter', colorKey: 'primary' as const, delay: '0.6s' },
  { label: 'elasticsearch', section: 'output', colorKey: 'accent'  as const, delay: '1.2s' },
]

const FEATURES = [
  { icon: 'sparkles',     label: 'AI pipeline builder', detail: 'Describe your pipeline in plain English — Claude and Jina build it for you', highlight: true  },
  { icon: 'node',         label: 'Visual canvas',        detail: 'Drag-and-drop plugins onto a canvas — no config syntax'                                     },
  { icon: 'document',     label: 'Live .conf preview',   detail: 'Config regenerates instantly with every change'                                             },
  { icon: 'bug',          label: 'Grok debugger',        detail: 'Test patterns against sample log lines in real time'                                       },
  { icon: 'importAction', label: 'Import & parse',       detail: 'Paste an existing .conf to reverse-parse it on canvas'                                     },
]

export function HomePage({ onGetStarted, onBrowseTemplates, onAIBuild }: HomePageProps) {
  const { euiTheme, colorMode } = useEuiTheme()
  const { darkMode, toggleDarkMode } = useBuilderStore()
  const isDark = colorMode === 'DARK'

  // Palette — derived from EUI tokens + per-mode overrides
  const C = {
    bg:          isDark ? '#07101F' : '#F0F4F9',
    surface:     isDark ? '#0D1B2E' : '#FFFFFF',
    surfaceHigh: isDark ? '#132338' : '#F5F8FC',
    border:      isDark ? '#1C3250' : euiTheme.colors.borderBaseSubdued,
    primary:     euiTheme.colors.textPrimary,
    success:     euiTheme.colors.textSuccess,
    accentColor: euiTheme.colors.textAccent,
    textPrimary: isDark ? '#EDF0F5' : euiTheme.colors.textParagraph,
    textSubdued: isDark ? '#6E7A8A' : euiTheme.colors.textSubdued,
    textMuted:   isDark ? '#3D5068' : euiTheme.colors.textDisabled,
    euiPrimary:  euiTheme.colors.primary,
  }

  const nodeColor: Record<string, string> = {
    success: C.success,
    primary: C.euiPrimary,
    accent:  C.accentColor,
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.textPrimary }}>
      <style>{`
        @keyframes nodePulse {
          0%, 100% { box-shadow: none; }
          45%       { box-shadow: 0 0 0 5px ${isDark ? 'rgba(11,100,221,0.2)' : 'rgba(11,100,221,0.12)'}; }
        }
        @keyframes flowDot {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .pipeline-node { animation: nodePulse 1.8s ease-in-out infinite; }
        .flow-dot      { animation: flowDot  1.8s ease-in-out infinite; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '16px 48px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <EuiIcon type="logoLogstash" size="m" />
        <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>
          Logstash Builder
        </span>
        <span style={{ fontSize: 14, color: C.textMuted, marginLeft: 2 }}>Pro</span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        <EuiToolTip content={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          <EuiButtonIcon
            iconType={darkMode ? 'sun' : 'moon'}
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            color="text"
            size="s"
          />
        </EuiToolTip>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        gap: 64,
        padding: '72px 48px 64px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        {/* Left: copy + CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{
            fontFamily: "'Roboto Mono', 'SF Mono', 'Fira Code', monospace",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.euiPrimary,
            margin: 0,
          }}>
            Visual pipeline composer
          </p>

          <h1 style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            color: C.textPrimary,
            margin: 0,
          }}>
            Build Logstash<br />
            pipelines<br />
            <span style={{ color: C.euiPrimary }}>visually.</span>
          </h1>

          <p style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: C.textSubdued,
            maxWidth: 380,
            margin: 0,
          }}>
            Add plugins, configure fields, watch your{' '}
            <code style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: 13,
              color: C.textPrimary,
              background: C.surfaceHigh,
              padding: '1px 6px',
              borderRadius: 4,
              border: `1px solid ${C.border}`,
            }}>
              logstash.conf
            </code>{' '}
            generate in real time. Or just describe what you want and let AI build it.
          </p>

          {/* AI Build highlight card */}
          <div
            onClick={onAIBuild}
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(13,26,54,0.9) 0%, rgba(20,15,40,0.9) 100%)'
                : 'linear-gradient(135deg, #f0f4ff 0%, #f8f0ff 100%)',
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)'}`,
              borderRadius: 10,
              padding: '14px 18px',
              maxWidth: 380,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: isDark
                ? '0 0 0 0 transparent'
                : '0 1px 6px rgba(99,102,241,0.08)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? 'rgba(139,92,246,0.6)' : 'rgba(99,102,241,0.5)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark
                ? '0 0 20px rgba(99,102,241,0.15)'
                : '0 4px 16px rgba(99,102,241,0.14)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = isDark ? '0 0 0 0 transparent' : '0 1px 6px rgba(99,102,241,0.08)'
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(99,102,241,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <EuiIcon type="sparkles" size="m" color="accent" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                ✨ Build with AI
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSubdued, lineHeight: 1.4 }}>
                Describe your pipeline in plain English → Claude + Jina build it
              </p>
            </div>
            <EuiIcon type="arrowRight" size="s" color="subdued" />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <EuiButton fill size="m" iconType="arrowRight" iconSide="right" onClick={onGetStarted}>
              Open Builder
            </EuiButton>
            <EuiButtonEmpty size="m" iconType="document" onClick={onBrowseTemplates}>
              Browse Templates
            </EuiButtonEmpty>
          </div>
        </div>

        {/* Right: animated pipeline */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
            {PIPELINE.map((node, i) => (
              <div key={node.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div
                  className="pipeline-node"
                  style={{
                    background: C.surfaceHigh,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '12px 20px',
                    minWidth: 230,
                    animationDelay: node.delay,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: nodeColor[node.colorKey],
                    textTransform: 'uppercase',
                    minWidth: 40,
                  }}>
                    {node.section}
                  </span>
                  <span style={{
                    fontFamily: "'Roboto Mono', 'SF Mono', 'Fira Code', monospace",
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.textPrimary,
                  }}>
                    {node.label}
                  </span>
                </div>

                {i < PIPELINE.length - 1 && (
                  <div style={{
                    position: 'relative',
                    width: 1.5,
                    height: 28,
                    marginLeft: 34,
                    background: C.border,
                  }}>
                    <div
                      className="flow-dot"
                      style={{
                        position: 'absolute',
                        left: -2.5,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: C.euiPrimary,
                        animationDelay: node.delay,
                        animationDuration: '1.8s',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, margin: '0 48px' }} />

      {/* ── Feature strip ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 48px',
      }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.label}
            onClick={f.highlight ? onAIBuild : undefined}
            style={{
              padding: '28px 20px',
              borderRight: i < FEATURES.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              cursor: f.highlight ? 'pointer' : 'default',
              background: f.highlight
                ? isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)'
                : 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={f.highlight ? e => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)' } : undefined}
            onMouseLeave={f.highlight ? e => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)' } : undefined}
          >
            <EuiIcon type={f.icon as any} size="m" color={f.highlight ? 'accent' : 'primary'} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: f.highlight ? C.accentColor : C.textPrimary }}>
              {f.label}
            </p>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: C.textSubdued }}>
              {f.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

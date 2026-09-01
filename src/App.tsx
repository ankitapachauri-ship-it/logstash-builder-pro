import { useState } from 'react'
import { EuiProvider } from '@elastic/eui'
import { Toolbar, PipelineTabs } from './components/toolbar/Toolbar'
import { AddPluginBar } from './components/plugin-palette/AddPluginBar'
import { Canvas } from './components/canvas/Canvas'
import { ConfigPanel } from './components/config-panel/ConfigPanel'
import { TemplatesModal } from './components/modals/TemplatesModal'
import { ImportModal } from './components/modals/ImportModal'
import { GrokDebugger } from './components/modals/GrokDebugger'
import { ConfigPreviewModal } from './components/modals/ConfigPreviewModal'
import { PipelineSettingsModal } from './components/modals/PipelineSettingsModal'
import { PipelinePromptModal } from './components/modals/PipelinePromptModal'
import { HomePage } from './components/home/HomePage'
import { useBuilderStore } from './store/useBuilderStore'

const fadeIn: React.CSSProperties = {
  animation: 'pageIn 0.18s ease-out both',
}

function BuilderApp() {
  const { darkMode, setShowTemplates, showPreview, setShowPreview } = useBuilderStore()
  const [view, setView] = useState<'home' | 'builder'>('home')
  const [showPipelineSettings, setShowPipelineSettings] = useState(false)
  const [showAIBuild, setShowAIBuild] = useState(false)

  return (
    <EuiProvider colorMode={darkMode ? 'dark' : 'light'}>
      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {view === 'home' ? (
        <div key="home" style={fadeIn}>
          <HomePage
            onGetStarted={() => setView('builder')}
            onBrowseTemplates={() => {
              setView('builder')
              setShowTemplates(true)
            }}
            onAIBuild={() => {
              setView('builder')
              setShowAIBuild(true)
            }}
          />
        </div>
      ) : (
        <div
          key="builder"
          style={{
            ...fadeIn,
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            background: 'var(--euiPageBackgroundColor)',
          }}
        >
          <Toolbar onHome={() => setView('home')} onAIBuild={() => setShowAIBuild(true)} />
          <PipelineTabs onOpenSettings={() => setShowPipelineSettings(true)} />
          <AddPluginBar />

          <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            <Canvas />
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              pointerEvents: 'auto',
            }}>
              <ConfigPanel />
            </div>
          </div>

          <TemplatesModal />
          <ImportModal />
          <GrokDebugger />
          {showPreview && <ConfigPreviewModal onClose={() => setShowPreview(false)} />}
          {showPipelineSettings && <PipelineSettingsModal onClose={() => setShowPipelineSettings(false)} />}
        </div>
      )}

      {/* AI Build modal — available from both home and builder */}
      {showAIBuild && <PipelinePromptModal onClose={() => setShowAIBuild(false)} />}
    </EuiProvider>
  )
}

export default BuilderApp

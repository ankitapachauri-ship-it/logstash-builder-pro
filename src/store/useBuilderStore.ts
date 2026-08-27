import { create } from 'zustand'
import type { PluginInstance } from '../lib/logstash-generator'
import type { Section } from '../lib/logstash-plugins'
import { LATEST } from '../lib/logstash-versions'

export interface PipelineSettings {
  workers: number          // pipeline.workers
  batchSize: number        // pipeline.batch.size
  batchDelay: number       // pipeline.batch.delay (ms)
  ordered: 'auto' | 'true' | 'false'  // pipeline.ordered
  queueType: 'memory' | 'persisted'   // queue.type
}

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  workers: 2,
  batchSize: 125,
  batchDelay: 50,
  ordered: 'auto',
  queueType: 'memory',
}

export interface Pipeline {
  id: string
  name: string
  inputs: PluginInstance[]
  filters: PluginInstance[]
  outputs: PluginInstance[]
  settings: PipelineSettings
}

interface BuilderStore {
  // Pipelines
  pipelines: Pipeline[]
  activePipelineId: string

  // UI state
  selectedInstanceId: string | null
  logstashVersion: string
  darkMode: boolean

  // Modals
  showTemplates: boolean
  showImport: boolean
  showGrok: boolean
  showPreview: boolean

  // Actions
  addPipeline: () => void
  removePipeline: (id: string) => void
  renamePipeline: (id: string, name: string) => void
  setActivePipeline: (id: string) => void

  addPlugin: (section: Section, pluginId: string) => void
  removePlugin: (section: Section, instanceId: string) => void
  updatePlugin: (section: Section, instanceId: string, values: Record<string, unknown>) => void
  toggleSecret: (section: Section, instanceId: string, fieldKey: string) => void
  setCondition: (section: Section, instanceId: string, condition: string) => void
  selectInstance: (id: string | null) => void

  updatePipelineSettings: (id: string, settings: Partial<PipelineSettings>) => void

  setLogstashVersion: (v: string) => void
  toggleDarkMode: () => void

  setShowTemplates: (v: boolean) => void
  setShowImport: (v: boolean) => void
  setShowGrok: (v: boolean) => void
  setShowPreview: (v: boolean) => void

  loadPipeline: (pipeline: Pipeline) => void
}

const createEmptyPipeline = (name = 'Pipeline 1'): Pipeline => ({
  id: crypto.randomUUID(),
  name,
  inputs: [],
  filters: [],
  outputs: [],
  settings: { ...DEFAULT_PIPELINE_SETTINGS },
})

const makeInstance = (pluginId: string): PluginInstance => ({
  id: crypto.randomUUID(),
  pluginId,
  values: {},
  secretKeystore: {},
  shownOptional: [],
})

export const useBuilderStore = create<BuilderStore>((set, get) => {
  const initial = createEmptyPipeline()

  const getActivePipeline = (): Pipeline => {
    const s = get()
    return s.pipelines.find(p => p.id === s.activePipelineId) ?? s.pipelines[0]
  }

  const updateActivePipeline = (updater: (p: Pipeline) => Pipeline) =>
    set(s => ({
      pipelines: s.pipelines.map(p =>
        p.id === s.activePipelineId ? updater(p) : p
      ),
    }))

  return {
    pipelines: [initial],
    activePipelineId: initial.id,
    selectedInstanceId: null,
    logstashVersion: LATEST,
    darkMode: false,
    showTemplates: false,
    showImport: false,
    showGrok: false,
    showPreview: false,

    addPipeline: () => {
      const np = createEmptyPipeline(`Pipeline ${get().pipelines.length + 1}`)
      set(s => ({ pipelines: [...s.pipelines, np], activePipelineId: np.id }))
    },

    removePipeline: (id) => {
      set(s => {
        const filtered = s.pipelines.filter(p => p.id !== id)
        if (!filtered.length) {
          const fallback = createEmptyPipeline()
          return { pipelines: [fallback], activePipelineId: fallback.id }
        }
        const activeId = s.activePipelineId === id ? filtered[0].id : s.activePipelineId
        return { pipelines: filtered, activePipelineId: activeId }
      })
    },

    renamePipeline: (id, name) =>
      set(s => ({ pipelines: s.pipelines.map(p => p.id === id ? { ...p, name } : p) })),

    setActivePipeline: (id) => set({ activePipelineId: id, selectedInstanceId: null }),

    addPlugin: (section, pluginId) => {
      const inst = makeInstance(pluginId)
      updateActivePipeline(p => ({ ...p, [section + 's']: [...p[section + 's' as keyof Pipeline] as PluginInstance[], inst] }))
      set({ selectedInstanceId: inst.id })
    },

    removePlugin: (section, instanceId) => {
      updateActivePipeline(p => ({
        ...p,
        [section + 's']: (p[section + 's' as keyof Pipeline] as PluginInstance[]).filter(i => i.id !== instanceId),
      }))
      set(s => ({ selectedInstanceId: s.selectedInstanceId === instanceId ? null : s.selectedInstanceId }))
    },

    updatePlugin: (section, instanceId, values) => {
      updateActivePipeline(p => ({
        ...p,
        [section + 's']: (p[section + 's' as keyof Pipeline] as PluginInstance[]).map(i =>
          i.id === instanceId ? { ...i, values: { ...i.values, ...values } } : i
        ),
      }))
    },

    toggleSecret: (section, instanceId, fieldKey) => {
      updateActivePipeline(p => ({
        ...p,
        [section + 's']: (p[section + 's' as keyof Pipeline] as PluginInstance[]).map(i =>
          i.id === instanceId
            ? { ...i, secretKeystore: { ...i.secretKeystore, [fieldKey]: !i.secretKeystore[fieldKey] } }
            : i
        ),
      }))
    },

    setCondition: (section, instanceId, condition) => {
      updateActivePipeline(p => ({
        ...p,
        [section + 's']: (p[section + 's' as keyof Pipeline] as PluginInstance[]).map(i =>
          i.id === instanceId ? { ...i, condition } : i
        ),
      }))
    },

    selectInstance: (id) => set({ selectedInstanceId: id }),

    updatePipelineSettings: (id, settings) =>
      set(s => ({
        pipelines: s.pipelines.map(p =>
          p.id === id ? { ...p, settings: { ...p.settings, ...settings } } : p
        ),
      })),

    setLogstashVersion: (v) => set({ logstashVersion: v }),

    toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),

    setShowTemplates: (v) => set({ showTemplates: v }),
    setShowImport: (v) => set({ showImport: v }),
    setShowGrok: (v) => set({ showGrok: v }),
    setShowPreview: (v) => set({ showPreview: v }),

    loadPipeline: (pipeline) => {
      const activePipeline = getActivePipeline()
      set(s => ({
        pipelines: s.pipelines.map(p => p.id === s.activePipelineId ? { ...pipeline, id: activePipeline.id, name: activePipeline.name } : p),
        selectedInstanceId: null,
      }))
    },
  }
})

export const useActivePipeline = () => {
  const { pipelines, activePipelineId } = useBuilderStore()
  const p = pipelines.find(p => p.id === activePipelineId) ?? pipelines[0]
  // Ensure settings are always present (handles in-memory pipelines created before settings existed)
  return { ...p, settings: { ...DEFAULT_PIPELINE_SETTINGS, ...p.settings } }
}

export type { PluginInstance, BuilderState } from '../lib/logstash-generator'
export type { Section, PluginDef, FieldDef } from '../lib/logstash-plugins'

export interface Pipeline {
  id: string
  name: string
  inputs: import('../lib/logstash-generator').PluginInstance[]
  filters: import('../lib/logstash-generator').PluginInstance[]
  outputs: import('../lib/logstash-generator').PluginInstance[]
}

export interface NodePosition {
  id: string
  x: number
  y: number
}

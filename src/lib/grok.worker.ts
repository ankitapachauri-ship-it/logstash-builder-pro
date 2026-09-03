// F-06: Web Worker for Grok pattern matching.
// The main thread posts { pattern, sample } and receives a GrokTestResult.
// Running on a worker means a runaway regex can be terminated via worker.terminate()
// without freezing the browser tab.
import { testGrok } from './grok'

self.onmessage = (e: MessageEvent<{ pattern: string; sample: string }>) => {
  const result = testGrok(e.data.pattern, e.data.sample)
  self.postMessage(result)
}

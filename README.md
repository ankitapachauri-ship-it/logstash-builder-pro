# Logstash Builder Pro

A visual pipeline composer for Elastic Logstash. Build, preview, and download production-ready Logstash configurations without writing a single line of YAML by hand.

**Live app** → https://logstash-builder-282748179141.europe-west1.run.app

---

## What it does

Logstash Builder Pro gives you a drag-and-drop canvas where each Logstash plugin — inputs, filters, outputs, codecs — is a node you wire together visually. Configure every field in a side panel, preview the generated `logstash.conf` and `pipelines.yml` in real time, and download them when you're done.

### Feature overview

| Feature | Details |
|---|---|
| **Visual canvas** | Drag plugins from the palette onto the canvas; draw edges to define flow |
| **Plugin library** | Input, filter, output, and codec plugins from the official Logstash catalog |
| **Smart config panel** | Required fields always visible; optional fields hidden behind a "+ Show N optional fields" button |
| **Grok debugger** | Test patterns against sample log lines with auto-suggest and smart-escape mode |
| **Pipeline settings** | Per-pipeline workers, batch size, batch delay, event ordering, and queue type |
| **Multi-pipeline** | Create and switch between multiple named pipelines in one session |
| **Config preview** | Two-tab modal showing `logstash.conf` and `pipelines.yml` with copy and download buttons |
| **Templates** | Starter templates for common use cases (nginx access logs, syslog, Kafka ingest, etc.) |
| **Import** | Paste an existing `logstash.conf` to reconstruct its pipeline visually |
| **Version selector** | Pin the generated config to a specific Logstash version |

---

## Tech stack

| Layer | Library | Version |
|---|---|---|
| UI framework | [Elastic UI (EUI)](https://eui.elastic.co) | 118 |
| Theme | EUI Borealis | 8 |
| Canvas | [@xyflow/react](https://reactflow.dev) | 12 |
| State | [Zustand](https://zustand-demo.pmnd.rs) | 5 |
| Build | [Vite](https://vite.dev) | 8 |
| Language | TypeScript | 6 |
| Runtime | React | 18 |

---

## Local development

**Prerequisites:** Node 20+, Yarn

```bash
# Clone
git clone https://github.com/elastic/logstash-builder-pro.git
cd logstash-builder-pro

# Install
yarn install

# Start dev server (http://localhost:5173)
yarn dev
```

### Other commands

```bash
yarn build          # Production build → dist/
yarn preview        # Serve the dist/ build locally
```

---

## Docker

### Build and run locally

```bash
docker compose up --build
# App available at http://localhost:8080
```

### Manual build

```bash
docker build -t logstash-builder .
docker run -p 8080:8080 logstash-builder
```

The image is a two-stage build:

1. **Builder** — `node:20-alpine` runs `yarn install` + `yarn build`
2. **Runner** — `nginx:1.27-alpine` serves the static `dist/` output

nginx is configured with:
- Gzip compression for JS/CSS/JSON/SVG
- 1-year immutable cache for Vite-fingerprinted assets
- SPA fallback (`try_files $uri $uri/ /index.html`)
- `/healthz` health-check endpoint

---

## Cloud Run deployment

The app is deployed to Google Cloud Run in `europe-west1`.

### Re-deploy after changes

```bash
# 1. Build and push via Cloud Build (no local Docker needed)
gcloud builds submit \
  --project=elastic-consulting \
  --region=europe-west1 \
  --tag europe-west1-docker.pkg.dev/elastic-consulting/cloud-run-source-deploy/logstash-builder:latest \
  .

# 2. Deploy the new image
gcloud run deploy logstash-builder \
  --image europe-west1-docker.pkg.dev/elastic-consulting/cloud-run-source-deploy/logstash-builder:latest \
  --platform managed \
  --region europe-west1 \
  --project elastic-consulting \
  --port 8080
```

### Infrastructure

| Resource | Value |
|---|---|
| Project | `elastic-consulting` |
| Region | `europe-west1` |
| Artifact Registry | `europe-west1-docker.pkg.dev/elastic-consulting/cloud-run-source-deploy/logstash-builder` |
| Service name | `logstash-builder` |
| Health check | `GET /healthz` |
| Memory | 256 Mi |
| Max instances | 3 |

---

## Project structure

```
src/
├── App.tsx                        # Root — modal state, layout
├── store/
│   └── useBuilderStore.ts         # Zustand store — pipelines, nodes, edges, settings
├── lib/
│   ├── logstash-catalog.generated.ts  # Plugin field definitions (generated from docs)
│   ├── logstash-generator.ts      # AST → logstash.conf string
│   ├── logstash-parser.ts         # logstash.conf string → AST
│   ├── logstash-plugins.ts        # Plugin metadata and defaults
│   ├── grok.ts                    # Client-side Grok pattern engine + auto-suggest
│   ├── grok-patterns.ts           # Built-in Grok pattern library
│   └── utils.ts                   # Shared helpers
├── components/
│   ├── canvas/
│   │   ├── Canvas.tsx             # React Flow canvas with defaultViewport
│   │   └── PluginNode.tsx         # Node renderer
│   ├── config-panel/
│   │   └── ConfigPanel.tsx        # Right-side field editor (required / optional sections)
│   ├── toolbar/
│   │   └── Toolbar.tsx            # Top bar — version picker, preview, download, pipeline tabs
│   ├── plugin-palette/
│   │   ├── PluginPalette.tsx      # Left-side plugin browser
│   │   └── AddPluginBar.tsx       # Quick-add search bar
│   ├── modals/
│   │   ├── GrokDebugger.tsx       # Grok pattern tester with smart-escape toggle
│   │   ├── ConfigPreviewModal.tsx # logstash.conf / pipelines.yml preview + download
│   │   ├── PipelineSettingsModal.tsx  # Workers, batch size, queue type, ordering
│   │   ├── TemplatesModal.tsx     # Starter pipeline templates
│   │   └── ImportModal.tsx        # Import existing logstash.conf
│   ├── preview/
│   │   └── ConfigPreview.tsx      # Inline config preview panel
│   └── home/
│       └── HomePage.tsx           # Landing / empty state
└── types/
    └── builder.ts                 # Shared TypeScript types
```

---

## Grok debugger — smart escape mode

When **Smart escape** is on, the auto-suggest engine treats structural characters (`[`, `]`, `(`, `)`, `{`, `}`, `|`, `;`) as literal delimiters rather than part of a captured field. This prevents patterns like `%{NOTSPACE:method}` from greedily consuming `[` and `]` that wrap a timestamp or log level.

Example — Apache error log line:

```
[Thu Aug 28 10:45:01.123 2025] [core:notice] [pid 1234] AH00094: Command line: 'httpd'
```

| Mode | Generated pattern |
|---|---|
| Default | `\[%{NOTSPACE:day} %{NOTSPACE:month} …` (brackets eaten) |
| Smart escape | `\[%{DAY:day} %{MONTH:month} %{MONTHDAY:day_num} %{TIME:time} %{YEAR:year}\] \[%{DATA:module}\] …` |

---

## Pipeline settings

Each pipeline stores its own settings, written into `pipelines.yml` at download time.

| Setting | Default | logstash.yml key |
|---|---|---|
| Workers | 2 | `pipeline.workers` |
| Batch size | 125 | `pipeline.batch.size` |
| Batch delay | 50 ms | `pipeline.batch.delay` |
| Event ordering | auto | `pipeline.ordered` |
| Queue type | memory | `queue.type` |

Non-default values for `ordered` and `queue.type` are omitted when they match the Logstash defaults, keeping `pipelines.yml` minimal.

---

## Contributing

1. Fork and clone
2. `yarn install && yarn dev`
3. Make changes — TypeScript strict mode is on, no `any` escapes
4. `yarn build` must pass clean before opening a PR

---

## License

Apache 2.0

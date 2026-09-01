// Human-readable descriptions for every plugin in the catalog.
// Used by the Jina embedding layer to match user prompts to relevant plugins.

export interface PluginDescription {
  id: string
  section: 'input' | 'filter' | 'output'
  description: string
}

export const PLUGIN_DESCRIPTIONS: PluginDescription[] = [
  // ── INPUT PLUGINS ────────────────────────────────────────────────────────────
  {
    id: 'beats',
    section: 'input',
    description:
      'Receives events from Elastic Beats agents such as Filebeat, Metricbeat, Packetbeat, and Winlogbeat. The standard way to ingest data from any Beats shipper into a Logstash pipeline.',
  },
  {
    id: 'dead_letter_queue',
    section: 'input',
    description:
      'Reads events that were previously written to Logstash\'s dead letter queue (DLQ). Use this to reprocess or inspect events that failed in a prior pipeline run.',
  },
  {
    id: 'elasticsearch',
    section: 'input',
    description:
      'Reads documents from an Elasticsearch index using a search query. Useful for re-indexing, data migration, or reading enrichment data from Elasticsearch.',
  },
  {
    id: 'file',
    section: 'input',
    description:
      'Reads log lines from files on disk, following them in real time (like tail -f). Supports glob patterns, multiline events, and sincedb for resuming after restarts. The primary input for reading local log files.',
  },
  {
    id: 'generator',
    section: 'input',
    description:
      'Generates synthetic test events at a configurable rate. Use this for load testing, pipeline benchmarking, or developing a pipeline without a real data source.',
  },
  {
    id: 'http',
    section: 'input',
    description:
      'Starts an HTTP server and receives events via POST requests. Ideal for webhooks, HTTP push APIs, and any service that can send HTTP payloads.',
  },
  {
    id: 'http_poller',
    section: 'input',
    description:
      'Periodically polls one or more HTTP endpoints on a schedule and ingests the responses. Use this to pull data from REST APIs, health-check URLs, or JSON feeds.',
  },
  {
    id: 'jdbc',
    section: 'input',
    description:
      'Executes SQL queries against any JDBC-compatible database (MySQL, PostgreSQL, Oracle, MSSQL, etc.) and ingests the results as events. Supports scheduled polling and tracking a column value to fetch only new rows.',
  },
  {
    id: 'kafka',
    section: 'input',
    description:
      'Consumes messages from one or more Apache Kafka topics. High-throughput, fault-tolerant ingestion from Kafka brokers with configurable consumer groups and offset management.',
  },
  {
    id: 'redis',
    section: 'input',
    description:
      'Reads events from a Redis list (BLPOP) or subscribes to a Redis pub/sub channel. Often used as a message broker buffer between data shippers and Logstash.',
  },
  {
    id: 's3',
    section: 'input',
    description:
      'Reads objects from an Amazon S3 bucket, either on a schedule or triggered by SQS notifications. Use for ingesting log files, CloudTrail events, or any data stored in S3.',
  },
  {
    id: 'sqs',
    section: 'input',
    description:
      'Reads messages from an Amazon SQS queue. Useful for event-driven ingestion where producers push messages to SQS and Logstash consumes them.',
  },
  {
    id: 'stdin',
    section: 'input',
    description:
      'Reads events from standard input (keyboard or piped data). Primarily used for quick local testing and development.',
  },
  {
    id: 'syslog',
    section: 'input',
    description:
      'Receives syslog messages over UDP or TCP on a configurable port. Parses RFC 3164 and RFC 5424 syslog formats automatically. The standard input for network devices and servers sending syslog.',
  },
  {
    id: 'tcp',
    section: 'input',
    description:
      'Listens on a TCP port and receives raw events over the socket. Use when you need low-level TCP ingestion without the syslog format overhead.',
  },
  {
    id: 'udp',
    section: 'input',
    description:
      'Listens on a UDP port and receives raw datagrams. Lightweight, connectionless ingestion for high-volume metrics or log streams that can tolerate occasional packet loss.',
  },

  // ── FILTER PLUGINS ───────────────────────────────────────────────────────────
  {
    id: 'cidr',
    section: 'filter',
    description:
      'Checks whether IP address fields fall within specified CIDR network ranges. Adds tags or sets fields based on the result. Use for network-based routing, classification, or security policies.',
  },
  {
    id: 'clone',
    section: 'filter',
    description:
      'Creates one or more duplicate copies of each event with different type values. Use to send the same event to multiple outputs or apply different processing to copies.',
  },
  {
    id: 'csv',
    section: 'filter',
    description:
      'Parses a field containing comma-separated values (CSV) or any delimiter-separated values into named columns. Handles quoted fields, custom delimiters, and optional headers.',
  },
  {
    id: 'date',
    section: 'filter',
    description:
      'Parses a date or timestamp string from a field and sets it as the event\'s @timestamp. Use whenever log timestamps need to replace the Logstash ingest time. Supports many formats including strptime, ISO 8601, and Unix epoch.',
  },
  {
    id: 'dissect',
    section: 'filter',
    description:
      'Splits a string into fields using a fixed delimiter template — faster than grok for logs with a predictable, consistent structure. Best for access logs, CSV-style logs, or any line where fields are separated by literal characters.',
  },
  {
    id: 'dns',
    section: 'filter',
    description:
      'Performs forward (hostname → IP) or reverse (IP → hostname) DNS lookups on specified fields. Useful for enriching events with hostnames or resolving IPs to domain names.',
  },
  {
    id: 'fingerprint',
    section: 'filter',
    description:
      'Generates a hash (MD5, SHA1, SHA256, MURMUR3, etc.) of one or more fields and stores it in a new field. Use for event deduplication, document ID generation, or data masking.',
  },
  {
    id: 'geoip',
    section: 'filter',
    description:
      'Looks up geographic location data for an IP address field — country, city, latitude, longitude, timezone, and ISP. Requires the MaxMind GeoIP database. Essential for geo-enrichment of web and network logs.',
  },
  {
    id: 'grok',
    section: 'filter',
    description:
      'Parses unstructured log text into named, structured fields using regex-based patterns. The primary log-parsing tool in Logstash. Hundreds of built-in patterns (COMMONAPACHELOG, SYSLOG, IP, TIMESTAMP_ISO8601, etc.) cover most log formats.',
  },
  {
    id: 'json',
    section: 'filter',
    description:
      'Parses a JSON string stored in a field and expands it into structured event fields. Use when your log lines or message field contain JSON-encoded data.',
  },
  {
    id: 'kv',
    section: 'filter',
    description:
      'Splits a field containing key=value pairs (like query strings or header values) into individual event fields. Configurable field separator, value separator, and prefix.',
  },
  {
    id: 'mutate',
    section: 'filter',
    description:
      'General-purpose field transformation plugin: rename, remove, copy, replace, convert types, strip whitespace, split strings, merge arrays, and apply gsub substitutions. The Swiss Army knife for field editing.',
  },
  {
    id: 'prune',
    section: 'filter',
    description:
      'Removes all fields from an event except those explicitly whitelisted. Use to minimize event size before sending to output, keeping only the fields you care about.',
  },
  {
    id: 'ruby',
    section: 'filter',
    description:
      'Executes arbitrary Ruby code against each event. The escape hatch for complex transformations that no other filter plugin handles. Can modify fields, create new events, or drop events entirely.',
  },
  {
    id: 'split',
    section: 'filter',
    description:
      'Splits a single event into multiple events based on an array field or a delimiter in a string field. Each element of the array becomes a separate event in the pipeline.',
  },
  {
    id: 'translate',
    section: 'filter',
    description:
      'Maps field values to new values using a lookup dictionary defined inline or loaded from a YAML/CSV file. Use for code-to-label mapping (HTTP status codes, error codes, country codes, etc.).',
  },
  {
    id: 'urldecode',
    section: 'filter',
    description:
      'Decodes percent-encoded URL characters (e.g. %20 → space, %2F → /) in one or more fields. Use after parsing URLs from query strings or access logs.',
  },
  {
    id: 'useragent',
    section: 'filter',
    description:
      'Parses HTTP User-Agent strings into structured fields: browser name, browser version, operating system, device type (mobile/desktop/bot). Uses the uap-core library for accurate parsing.',
  },
  {
    id: 'xml',
    section: 'filter',
    description:
      'Parses an XML string stored in a field into structured event fields. Supports XPath queries to extract specific elements. Use for SOAP payloads, XML log formats, or any XML-encoded data.',
  },

  // ── OUTPUT PLUGINS ────────────────────────────────────────────────────────────
  {
    id: 'elasticsearch',
    section: 'output',
    description:
      'Ships events to Elasticsearch for indexing. The primary output for the Elastic Stack. Supports bulk indexing, index templates, data streams, ILM policies, and both basic and API-key authentication. Use this to send data to Kibana-compatible storage.',
  },
  {
    id: 'email',
    section: 'output',
    description:
      'Sends events as email notifications via an SMTP server. Use for alerting — trigger emails when specific error conditions or thresholds appear in your log stream.',
  },
  {
    id: 'file',
    section: 'output',
    description:
      'Writes events to files on disk. Supports rotation by date, size, or time. Use for archiving, local debugging, or writing processed output to a file for another system to consume.',
  },
  {
    id: 'http',
    section: 'output',
    description:
      'Sends events to an HTTP endpoint via POST, PUT, or other methods. Use to ship data to webhooks, REST APIs, Splunk HEC, Datadog, or any service with an HTTP intake.',
  },
  {
    id: 'kafka',
    section: 'output',
    description:
      'Publishes events to Apache Kafka topics. Use to fan out processed events to downstream consumers or to buffer output for other systems.',
  },
  {
    id: 'pipe',
    section: 'output',
    description:
      'Passes events to an external command via stdin. Use for integration with shell scripts or legacy programs that read from standard input.',
  },
  {
    id: 'redis',
    section: 'output',
    description:
      'Pushes events to a Redis list (RPUSH) or publishes to a Redis pub/sub channel. Use as a message broker handoff point or to buffer events for another consumer.',
  },
  {
    id: 's3',
    section: 'output',
    description:
      'Uploads events as objects to Amazon S3, with configurable prefixes, rotation intervals, and compression. Use for long-term archival, data lake ingestion, or cost-effective cold storage.',
  },
  {
    id: 'sqs',
    section: 'output',
    description:
      'Sends events to an Amazon SQS queue. Use to trigger downstream AWS Lambda functions, hand off to other SQS consumers, or decouple pipeline stages.',
  },
  {
    id: 'stdout',
    section: 'output',
    description:
      'Prints events to standard output (terminal). Used during development and debugging to inspect what events look like at the end of the pipeline. Not for production.',
  },
  {
    id: 'tcp',
    section: 'output',
    description:
      'Sends events over a TCP socket connection. Use to forward processed events to another Logstash instance, a syslog server, or any TCP listener.',
  },
  {
    id: 'udp',
    section: 'output',
    description:
      'Sends events over a UDP socket. Lightweight, fire-and-forget delivery to another host. Use for high-volume metric forwarding where occasional packet loss is acceptable.',
  },
]

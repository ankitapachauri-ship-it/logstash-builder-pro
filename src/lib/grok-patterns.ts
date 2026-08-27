// Reference list of the official Logstash ECS grok patterns
// (logstash-plugins/logstash-patterns-core, patterns/ecs-v1/grok-patterns).
// Names + human descriptions for the in-app helper; full regexes live upstream.
export const GROK_PATTERNS_URL =
  "https://github.com/logstash-plugins/logstash-patterns-core/blob/main/patterns/ecs-v1/grok-patterns";

export interface GrokPattern {
  name: string;
  group: string;
  desc: string;
}

export const GROK_PATTERNS: GrokPattern[] = [
  // Core
  { name: "WORD", group: "Core", desc: "A single word (\\w+)." },
  { name: "NOTSPACE", group: "Core", desc: "One or more non-whitespace characters." },
  { name: "SPACE", group: "Core", desc: "Zero or more whitespace characters." },
  { name: "DATA", group: "Core", desc: "Any characters, lazy (shortest match)." },
  { name: "GREEDYDATA", group: "Core", desc: "Any characters, greedy (rest of the line)." },
  { name: "QUOTEDSTRING", group: "Core", desc: "A single/double/back-quoted string. Alias: QS." },
  { name: "UUID", group: "Core", desc: "A UUID (8-4-4-4-12 hex)." },
  { name: "USERNAME", group: "Core", desc: "A username (letters, digits, . _ -). Alias: USER." },
  { name: "EMAILADDRESS", group: "Core", desc: "An email address." },
  { name: "LOGLEVEL", group: "Core", desc: "Log level: DEBUG/INFO/WARN/ERROR/FATAL, etc." },

  // Numbers
  { name: "INT", group: "Numbers", desc: "A signed integer." },
  { name: "NUMBER", group: "Numbers", desc: "An integer or floating-point number." },
  { name: "POSINT", group: "Numbers", desc: "A positive integer (> 0)." },
  { name: "NONNEGINT", group: "Numbers", desc: "A non-negative integer (>= 0)." },
  { name: "BASE10NUM", group: "Numbers", desc: "A base-10 number (int or float)." },
  { name: "BASE16NUM", group: "Numbers", desc: "A hexadecimal number." },

  // Network
  { name: "IP", group: "Network", desc: "An IPv4 or IPv6 address." },
  { name: "IPV4", group: "Network", desc: "An IPv4 address." },
  { name: "IPV6", group: "Network", desc: "An IPv6 address." },
  { name: "HOSTNAME", group: "Network", desc: "A DNS hostname." },
  { name: "IPORHOST", group: "Network", desc: "An IP address or a hostname." },
  { name: "HOSTPORT", group: "Network", desc: "host:port." },
  { name: "MAC", group: "Network", desc: "A MAC address (Cisco/Windows/common)." },

  // URI / Paths
  { name: "URI", group: "URI / Paths", desc: "A full URI (proto://host/path?query)." },
  { name: "URIPROTO", group: "URI / Paths", desc: "URI scheme, e.g. http, https." },
  { name: "URIHOST", group: "URI / Paths", desc: "URI host with optional port." },
  { name: "URIPATH", group: "URI / Paths", desc: "URI path segment." },
  { name: "URIPARAM", group: "URI / Paths", desc: "URI query string (with leading ?)." },
  { name: "URIPATHPARAM", group: "URI / Paths", desc: "URI path plus optional query." },
  { name: "PATH", group: "URI / Paths", desc: "A Unix or Windows filesystem path." },
  { name: "UNIXPATH", group: "URI / Paths", desc: "A Unix filesystem path." },
  { name: "WINPATH", group: "URI / Paths", desc: "A Windows filesystem path." },

  // Dates & times
  {
    name: "TIMESTAMP_ISO8601",
    group: "Dates & times",
    desc: "ISO8601 timestamp (yyyy-MM-dd'T'HH:mm:ss…).",
  },
  { name: "DATESTAMP", group: "Dates & times", desc: "Date and time separated by - or space." },
  { name: "DATE", group: "Dates & times", desc: "A US or EU date." },
  { name: "DATE_US", group: "Dates & times", desc: "US date (MM/dd/yyyy)." },
  { name: "DATE_EU", group: "Dates & times", desc: "EU date (dd.MM.yyyy)." },
  { name: "TIME", group: "Dates & times", desc: "Time of day HH:mm:ss." },
  { name: "HTTPDATE", group: "Dates & times", desc: "Apache/HTTP access-log date." },
  { name: "MONTH", group: "Dates & times", desc: "Month name (Jan/January, multi-locale)." },
  { name: "MONTHDAY", group: "Dates & times", desc: "Day of month (1–31)." },
  { name: "YEAR", group: "Dates & times", desc: "2- or 4-digit year." },
  { name: "ISO8601_TIMEZONE", group: "Dates & times", desc: "Timezone (Z or ±HH:mm)." },

  // Syslog
  { name: "SYSLOGBASE", group: "Syslog", desc: "Syslog timestamp + host + program prefix." },
  { name: "SYSLOGTIMESTAMP", group: "Syslog", desc: "Syslog timestamp (MMM dd HH:mm:ss)." },
  { name: "SYSLOGHOST", group: "Syslog", desc: "Syslog host (IP or hostname)." },
  { name: "SYSLOGPROG", group: "Syslog", desc: "Program name and optional PID." },
  { name: "SYSLOGFACILITY", group: "Syslog", desc: "Syslog facility/priority code." },
];

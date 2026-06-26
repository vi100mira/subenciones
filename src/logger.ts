type LogLevel = "info" | "warn" | "error";

const SECRET_KEYS = [
  "authorization",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "secret",
  "service_role",
  "password",
  "client_secret"
];

function redactValue(key: string, value: unknown): unknown {
  const normalized = key.toLowerCase();
  if (SECRET_KEYS.some((secretKey) => normalized.includes(secretKey))) return "[redacted]";
  if (typeof value === "string" && value.length > 160) return `${value.slice(0, 120)}...[truncated]`;
  return value;
}

function redact(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(redact);

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => [
      key,
      value && typeof value === "object" ? redact(value) : redactValue(key, value)
    ])
  );
}

export function log(level: LogLevel, event: string, detail: Record<string, unknown> = {}) {
  const redactedDetail = redact(detail) as Record<string, unknown>;
  const payload = {
    event,
    ...redactedDetail,
    at: new Date().toISOString()
  };

  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

export const logInfo = (event: string, detail?: Record<string, unknown>) => log("info", event, detail);
export const logWarn = (event: string, detail?: Record<string, unknown>) => log("warn", event, detail);
export const logError = (event: string, detail?: Record<string, unknown>) => log("error", event, detail);

export const PRIVATE_PREFLIGHT_VERSION = "v1";
export const PRIVATE_PREFLIGHT_MIN_FILES = 3;
export const PRIVATE_PREFLIGHT_MIN_BYTES = 100 * 1024;
export const PRIVATE_PREFLIGHT_EMPTY_BYTES = 4 * 1024;

export type PrivateSourceManifest = {
  totalFiles: number;
  supportedFiles: number;
  supportedBytes: number;
};

export type PrivateSourcePreflightStatus = "blocked" | "review" | "ready" | "ready_limited";

function count(value: unknown, label: string, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > maximum) {
    throw new Error(`Recuento inválido en ${label}`);
  }
  return Number(value);
}

export function assessPrivateSourceManifest(input: unknown, acceptLimited = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Falta el resumen del preanálisis");
  const value = input as Record<string, unknown>;
  const manifest: PrivateSourceManifest = {
    totalFiles: count(value.totalFiles, "totalFiles", 1_000_000),
    supportedFiles: count(value.supportedFiles, "supportedFiles", 1_000_000),
    supportedBytes: count(value.supportedBytes, "supportedBytes", 1_000_000_000_000_000)
  };
  if (manifest.supportedFiles > manifest.totalFiles) throw new Error("El resumen de archivos es incoherente");

  let status: PrivateSourcePreflightStatus = "ready";
  let reason = "La fuente supera la criba mínima y puede inventariarse.";
  if (!manifest.totalFiles) {
    status = "blocked"; reason = "La fuente está vacía.";
  } else if (!manifest.supportedFiles) {
    status = "blocked"; reason = "No contiene archivos PDF, DOCX, XLSX, JPG o PNG utilizables.";
  } else if (manifest.supportedBytes < PRIVATE_PREFLIGHT_EMPTY_BYTES) {
    status = "blocked"; reason = "Los archivos compatibles están vacíos o tienen un tamaño insuficiente.";
  } else if (manifest.supportedFiles < PRIVATE_PREFLIGHT_MIN_FILES || manifest.supportedBytes < PRIVATE_PREFLIGHT_MIN_BYTES) {
    status = acceptLimited ? "ready_limited" : "review";
    reason = acceptLimited
      ? "Fuente pequeña aceptada expresamente para inventario."
      : "La fuente parece poco sustancial; revísala o confirma que deseas continuar.";
  }
  return { version: PRIVATE_PREFLIGHT_VERSION, status, reason, manifest, aiCalls: 0, canQueue: ["ready", "ready_limited"].includes(status) };
}

export function storedPrivatePreflightCanQueue(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  const preflight = (config as Record<string, unknown>).preflight;
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) return false;
  const value = preflight as Record<string, unknown>;
  return value.version === PRIVATE_PREFLIGHT_VERSION && ["ready", "ready_limited"].includes(String(value.status));
}

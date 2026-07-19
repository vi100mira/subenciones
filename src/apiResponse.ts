export type ApiOk<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string };
export type ApiResult<T> = ApiOk<T> | ApiError;

export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function fail(error: string): ApiError {
  return { ok: false, error };
}

export function errorMessage(error: unknown, fallback = "Error inesperado"): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

export async function readApiJson<T = unknown>(response: Response, endpoint: string): Promise<T> {
  const raw = await response.text();
  let payload: unknown = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(raw.trim() || `Respuesta API invalida en ${endpoint} (HTTP ${response.status})`);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error(`Respuesta API vacia en ${endpoint} (HTTP ${response.status})`);
  }

  return payload as T;
}

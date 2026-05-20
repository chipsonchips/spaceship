import { isAxiosError } from "axios";

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

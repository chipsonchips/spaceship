import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("authTokens");
    if (!raw) return null;
    return (JSON.parse(raw) as { accessToken?: string }).accessToken ?? null;
  } catch {
    return null;
  }
}

function readAdminSecret(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminSecret");
}

function attachAuth(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = readAuthToken();
  const adminSecret = readAdminSecret();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (adminSecret) {
    config.headers.Authorization = `Bearer ${adminSecret}`;
  }

  if (adminSecret) {
    config.headers["x-admin-secret"] = adminSecret;
  }

  return config;
}

/** Shared axios instance for all REST calls. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(attachAuth);

/** Same client — use when auth headers are required (explicit alias). */
export const authClient = apiClient;

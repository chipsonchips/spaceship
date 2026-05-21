import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError } from "axios";

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

function handleAuthError(error: AxiosError): Promise<AxiosError> {
  if (error.response?.status === 401) {
    // Token expired or invalid, clear auth
    if (typeof window !== "undefined") {
      localStorage.removeItem("authTokens");
      localStorage.removeItem("authUser");
      localStorage.removeItem("authTokenTimestamp");

      // Dispatch custom event to notify AuthContext
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
  }
  return Promise.reject(error);
}

/** Shared axios instance for all REST calls. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(attachAuth);
apiClient.interceptors.response.use(
  (response) => response,
  handleAuthError
);

/** Same client — use when auth headers are required (explicit alias). */
export const authClient = apiClient;

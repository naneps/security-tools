// Centralized backend calls. All paths are proxied to the FastAPI backend by Vite.
// For desktop builds (Tauri production), we use a full backend URL.
import { TestConfig, Endpoint, RunConfig } from '../types'

const BACKEND_BASE = (import.meta as any).env?.VITE_BACKEND_URL || ''

function getUrl(path: string) {
  if (BACKEND_BASE) {
    return `${BACKEND_BASE}${path}`
  }
  // In production (Tauri/Electron build), default to local backend
  if (import.meta.env.PROD) {
    return `http://127.0.0.1:8000${path}`
  }
  return path
}

async function req<T = any>(url: string, init?: RequestInit): Promise<T> {
  const fullUrl = getUrl(url)
  const res = await fetch(fullUrl, init)
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  // 204 / empty
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export interface ProjectsResponse {
  current_project_id: string
  projects: any[]
  global_variables: Record<string, string>
}

export interface ImportProjectResponse {
  id: string
  name: string
  imported: {
    tests: number
    environments: number
  }
  config: TestConfig
}

export const api = {
  // Config
  getConfig: () => req<TestConfig>('/config'),

  // Projects
  listProjects: () => req<ProjectsResponse>('/projects'),
  createProject: (name: string, base_url?: string) =>
    req<{ id: string; name: string }>('/projects', jsonInit('POST', { name, base_url })),
  switchProject: (id: string) => req(`/projects/${id}/switch`, jsonInit('POST')),
  renameProject: (id: string, name: string) => req(`/projects/${id}`, jsonInit('PUT', { name })),
  updateProjectItems: (id: string, items: any[]) => req(`/projects/${id}`, jsonInit('PUT', { items })),
  updateEnvironments: (id: string, environments: any[]) =>
    req(`/projects/${id}`, jsonInit('PUT', { environments })),
  deleteProject: (id: string) => req(`/projects/${id}`, jsonInit('DELETE')),
  projectTemplate: () => req<Record<string, unknown>>('/projects/template'),
  exportProject: (id: string, includeSecrets = false) =>
    req<Record<string, unknown>>(`/projects/${id}/export?include_secrets=${includeSecrets ? 'true' : 'false'}`),
  importProject: (payload: unknown) =>
    req<ImportProjectResponse>('/projects/import', jsonInit('POST', payload)),

  // Environments
  createEnvironment: (projectId: string, env: { name: string; base_url: string; variables?: Record<string, string> }) =>
    req(`/projects/${projectId}/environments`, jsonInit('POST', env)),
  switchEnvironment: (projectId: string, envId: string) =>
    req(`/projects/${projectId}/environments/${envId}/switch`, jsonInit('POST')),

  // Global variables
  saveGlobal: (variables: Record<string, string>) => req('/global', jsonInit('PUT', { variables })),

  // Endpoints
  createTest: (test: Partial<Endpoint>) => req<Endpoint>('/tests', jsonInit('POST', test)),
  updateTest: (id: string, test: Partial<Endpoint>) => req<Endpoint>(`/tests/${id}`, jsonInit('PUT', test)),
  deleteTest: (id: string) => req(`/tests/${id}`, jsonInit('DELETE')),
  duplicateTest: (id: string) => req<Endpoint>(`/tests/${id}/duplicate`, jsonInit('POST')),

  // Runs
  startRun: (test_id: string, cfg: RunConfig) =>
    req<{ run_id: string }>('/run', jsonInit('POST', { test_id, ...cfg })),
  stopRun: (runId: string) => req(`/stop/${runId}`, jsonInit('POST')),
  getStatus: (runId: string) => req(`/status/${runId}`),
}

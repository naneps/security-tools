import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { KVEditor } from './KVEditor'
import { PayloadEditor } from './PayloadEditor'
import { toast } from './ui/toast'
import { TestConfig } from '../types'

interface Props {
  testId: string | null
  config: TestConfig
  currentProjectName?: string
  currentEnvName?: string
  onClose: () => void
  onSave: () => void
}

export default function EndpointEditor({ testId, config, currentProjectName, currentEnvName, onClose, onSave }: Props) {
  const [form, setForm] = useState<any>(getDefaultForm())
  const [authType, setAuthType] = useState<'none' | 'inherit' | 'bearer' | 'apikey' | 'basic' | 'custom'>('inherit')
  const [authVar, setAuthVar] = useState('access_token')

  function getDefaultForm() {
    return {
      name: 'New Endpoint',
      url: '/your-endpoint',
      method: 'POST',
      payload_type: 'json',
      headers: { 'Content-Type': 'application/json' },
      cookies: {},
      payload: {},
      extractors: {}
    }
  }

  useEffect(() => {
    if (testId) {
      const existing = config.tests.find((t: any) => t.id === testId)
      if (existing) {
        const loaded = {
          ...existing,
          headers: existing.headers || {},
          cookies: existing.cookies || {},
          payload: existing.payload || {},
          extractors: existing.extractors || {}
        }
        setForm(loaded)

        // Detect current auth
        const auth = (existing.headers?.Authorization || '').trim()
        if (!auth) {
          setAuthType('none')
        } else if (auth.startsWith('Bearer {{')) {
          setAuthType('bearer')
          const m = auth.match(/\{\{([^}]+)\}\}/)
          if (m) setAuthVar(m[1])
        } else if (auth.includes('{{')) {
          setAuthType('apikey')
          const m = auth.match(/\{\{([^}]+)\}\}/)
          if (m) setAuthVar(m[1])
        } else {
          setAuthType('custom')
        }
      }
    } else {
      setForm(getDefaultForm())
      setAuthType('inherit')
      setAuthVar('access_token')
    }
  }, [testId, config])

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }))
  }

  // Smart Authorization handler
  const updateAuth = (type: string, variable?: string) => {
    setAuthType(type as any)
    if (variable) setAuthVar(variable)

    let authValue = ''

    if (type === 'none') {
      const { Authorization, ...rest } = form.headers || {}
      handleChange('headers', rest)
      return
    }

    if (type === 'inherit') {
      // Don't set explicit header, will rely on project/env
      const { Authorization, ...rest } = form.headers || {}
      handleChange('headers', rest)
      return
    }

    if (type === 'bearer') {
      authValue = `Bearer {{${variable || authVar}}}`
    } else if (type === 'apikey') {
      authValue = `{{${variable || authVar}}}`
    } else if (type === 'basic') {
      authValue = `Basic {{${variable || 'username:password'}}}`
    } else if (type === 'custom') {
      authValue = `{{${variable || authVar}}}`
    }

    handleChange('headers', {
      ...(form.headers || {}),
      Authorization: authValue
    })
  }

  const save = async () => {
    const headers = { ...(form.headers || {}) }
    const cookies = form.cookies || {}
    if (Object.keys(cookies).length > 0) {
      headers['Cookie'] = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
    }

    const payloadToSend = {
      ...form,
      headers,
      cookies: undefined  // don't send cookies separately
    }

    const url = testId ? `/tests/${testId}` : `/tests`

    try {
      const res = await fetch(url, {
        method: testId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(testId ? 'Endpoint updated' : 'Endpoint created')
      onSave()
      onClose()
    } catch {
      toast.error('Failed to save endpoint')
    }
  }

  return (
    <div className="w-full">
      {/* Full-width sticky header to utilize space */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
          ← Back
        </Button>

        <div className="flex-1 min-w-0">
          <Input
            value={form.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Endpoint name"
            className="font-semibold text-lg h-9 border-0 bg-transparent focus-visible:ring-1 px-1"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {currentProjectName && <span>{currentProjectName}</span>}
          {currentEnvName && <span className="text-emerald-500">• {currentEnvName}</span>}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save}>Save Endpoint</Button>
        </div>
      </div>

      <div className="px-2 pb-8">
        {/* Compact top row - full width utilization */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 items-end">
          <div className="md:col-span-2">
            <Label className="text-[10px] uppercase">Method</Label>
            <select
              value={form.method}
              onChange={(e) => handleChange('method', e.target.value)}
              className="w-full h-9 rounded border border-input bg-background px-2 text-sm"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label className="text-[10px] uppercase">Body Type</Label>
            <select
              value={form.payload_type}
              onChange={(e) => handleChange('payload_type', e.target.value)}
              className="w-full h-9 rounded border border-input bg-background px-2 text-sm"
            >
              <option value="json">JSON</option>
              <option value="form">Form</option>
              <option value="multipart">Multipart</option>
            </select>
          </div>

          <div className="md:col-span-8">
            <Label className="text-[10px] uppercase">URL</Label>
            <Input
              value={form.url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              className="font-mono h-9"
              placeholder="/api/endpoint"
            />
          </div>
        </div>

        {/* Main 2-column grid for full width utilization */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* LEFT column: Auth + Headers + Cookies */}
          <div className="space-y-4">
            {/* Improved Authorization with Dropdown + Inherit */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Authorization
                  {currentEnvName && <span className="text-[10px] text-muted-foreground font-normal">(current: {currentEnvName})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    value={authType}
                    onChange={(e) => updateAuth(e.target.value)}
                    className="w-full h-9 rounded border border-input bg-background px-2 text-sm mt-1"
                  >
                    <option value="inherit">Inherit from current project/environment</option>
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key</option>
                    <option value="basic">Basic Auth</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {authType !== 'none' && authType !== 'inherit' && (
                  <div>
                    <Label className="text-xs">Variable / Value</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={authVar}
                        onChange={(e) => updateAuth(authType, e.target.value)}
                        className="font-mono h-9 text-sm flex-1"
                        placeholder="access_token"
                      />
                      <Button variant="outline" size="sm" onClick={() => updateAuth(authType, 'access_token')}>token</Button>
                      <Button variant="outline" size="sm" onClick={() => updateAuth(authType, 'api_key')}>key</Button>
                    </div>
                  </div>
                )}

                {form.headers?.Authorization && (
                  <div className="text-xs bg-muted p-2 rounded font-mono break-all">
                    {form.headers.Authorization}
                  </div>
                )}

                {authType === 'inherit' && (
                  <p className="text-xs text-emerald-500">Will use auth configured in the current environment</p>
                )}
                {authType === 'none' && (
                  <p className="text-xs text-muted-foreground">No Authorization header will be sent</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Headers</CardTitle>
              </CardHeader>
              <CardContent>
                <KVEditor data={form.headers || {}} onChange={(h) => handleChange('headers', h)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cookies</CardTitle>
              </CardHeader>
              <CardContent>
                <KVEditor data={form.cookies || {}} onChange={(c) => handleChange('cookies', c)} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT column: Payload + Extractors */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payload / Body</CardTitle>
              </CardHeader>
              <CardContent>
                <PayloadEditor value={form.payload || {}} onChange={(p) => handleChange('payload', p)} />
                <div className="text-[10px] text-amber-400 mt-2">
                  Dynamic: {'{{random_string}}'} {'{{random_email}}'} {'{{random_phone}}'} • use {'{{var}}'} from env
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Response Extractors</CardTitle>
              </CardHeader>
              <CardContent>
                <KVEditor
                  data={form.extractors || {}}
                  onChange={(e) => handleChange('extractors', e)}
                />
                <p className="text-[10px] text-emerald-500 mt-2">Example: access_token → body.access_token</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

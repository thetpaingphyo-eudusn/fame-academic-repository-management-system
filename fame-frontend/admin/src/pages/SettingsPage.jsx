import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";

import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Globe,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Key,
  Zap
} from 'lucide-react'

const SettingsPage = () => {
  const { user } = useAuth()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      projectUpdates: true,
      gradeAlerts: true,
      systemAnnouncements: false
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      loginAlerts: true
    },
    appearance: {
      compactView: false,
      showAnimations: true,
      defaultPageSize: 20
    }
  })

  const [aiLoading, setAiLoading] = useState(true)
  const [aiSaving, setAiSaving] = useState(false)
  const [aiTesting, setAiTesting] = useState(false)
  const [aiClearing, setAiClearing] = useState(false)
  const [cursorTesting, setCursorTesting] = useState(false)
  const [aiMessage, setAiMessage] = useState({ type: '', text: '' })
  const [aiCatalog, setAiCatalog] = useState(null)
  const [aiForm, setAiForm] = useState({
    provider: 'gemini',
    chatModel: '',
    embedModel: '',
    chatEnabled: true,
    embeddingEnabled: false,
    localFallbackEnabled: true,
    codingAssistantEnabled: true,
    codingAssistantEngine: 'standard',
    cursorModel: 'composer-2.5',
    codingModel: '',
    cursorApiKey: '',
    hasCursorApiKey: false,
    cursorApiKeyMasked: '',
    apiKey: '',
    hasApiKey: false,
    apiKeyMasked: '',
    keySource: 'none',
  })

  useEffect(() => {
    loadAiSettings()
  }, [])

  const loadAiSettings = async () => {
    setAiLoading(true)
    try {
      const res = await api.get('/admin/settings/ai')
      const data = res.data.data
      setAiCatalog(data.providers || null)
      setAiForm({
        provider: data.provider || 'gemini',
        chatModel: data.chatModel || '',
        embedModel: data.embedModel || '',
        chatEnabled: data.chatEnabled !== false,
        embeddingEnabled: !!data.embeddingEnabled,
        localFallbackEnabled: data.localFallbackEnabled !== false,
        codingAssistantEnabled: data.codingAssistantEnabled !== false,
        codingAssistantEngine: data.codingAssistantEngine || 'standard',
        cursorModel: data.cursorModel || 'composer-2.5',
        codingModel: data.codingModel || '',
        cursorApiKey: '',
        hasCursorApiKey: !!data.hasCursorApiKey,
        cursorApiKeyMasked: data.cursorApiKeyMasked || '',
        apiKey: '',
        hasApiKey: !!data.hasApiKey,
        apiKeyMasked: data.apiKeyMasked || '',
        keySource: data.keySource || 'none',
      })
      if (data.notice) {
        setAiMessage({ type: 'success', text: data.notice })
      }
    } catch (error) {
      setAiMessage({ type: 'error', text: 'Failed to load AI settings' })
    } finally {
      setAiLoading(false)
    }
  }

  const handleProviderChange = (provider) => {
    const preset = aiCatalog?.[provider]
    setAiForm((prev) => ({
      ...prev,
      provider,
      chatModel: preset?.defaultChatModel || prev.chatModel,
      embedModel: preset?.defaultEmbedModel || prev.embedModel,
      codingModel: preset?.defaultCodingModel || prev.codingModel,
    }))
  }

  const detectProviderFromKey = (key) => {
    const k = String(key || '').trim()
    if (k.startsWith('sk-or-v1-') || k.startsWith('sk-or-')) return 'openrouter'
    if (k.startsWith('AIza') || k.startsWith('AQ.')) return 'gemini'
    if (k.startsWith('sk-')) return 'openai'
    return null
  }

  const handleApiKeyChange = (value) => {
    const detected = detectProviderFromKey(value)
    if (detected && aiCatalog?.[detected]) {
      const preset = aiCatalog[detected]
      setAiForm((prev) => ({
        ...prev,
        apiKey: value,
        provider: detected,
        chatModel: preset.defaultChatModel,
        embedModel: preset.defaultEmbedModel,
      }))
      return
    }
    setAiForm((prev) => ({ ...prev, apiKey: value }))
  }

  const handleSaveAiSettings = async () => {
    setAiSaving(true)
    setAiMessage({ type: '', text: '' })
    try {
      const payload = {
        provider: aiForm.provider,
        chatModel: aiForm.chatModel,
        embedModel: aiForm.embedModel,
        chatEnabled: aiForm.chatEnabled,
        embeddingEnabled: aiForm.embeddingEnabled,
        localFallbackEnabled: aiForm.localFallbackEnabled,
        codingAssistantEnabled: aiForm.codingAssistantEnabled,
        codingAssistantEngine: aiForm.codingAssistantEngine,
        cursorModel: aiForm.cursorModel,
        codingModel: aiForm.codingModel,
      }
      if (aiForm.apiKey.trim()) payload.apiKey = aiForm.apiKey.trim()
      if (aiForm.cursorApiKey.trim()) payload.cursorApiKey = aiForm.cursorApiKey.trim()

      const res = await api.put('/admin/settings/ai', payload)
      const data = res.data.data
      setAiForm((prev) => ({
        ...prev,
        apiKey: '',
        cursorApiKey: '',
        hasApiKey: !!data.hasApiKey,
        hasCursorApiKey: !!data.hasCursorApiKey,
        cursorApiKeyMasked: data.cursorApiKeyMasked || '',
        apiKeyMasked: data.apiKeyMasked || '',
        keySource: data.keySource || prev.keySource,
      }))
      setAiMessage({ type: 'success', text: res.data.message || data.notice || 'AI settings saved. Changes apply immediately — no server restart needed.' })
    } catch (error) {
      setAiMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save AI settings' })
    } finally {
      setAiSaving(false)
      setTimeout(() => setAiMessage({ type: '', text: '' }), 5000)
    }
  }

  const handleTestCursorConnection = async () => {
    setCursorTesting(true)
    setAiMessage({ type: '', text: '' })
    try {
      const res = await api.post('/admin/settings/ai/test-cursor')
      const data = res.data.data
      setAiMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'Cursor OK' : 'Cursor connection failed'),
      })
    } catch (error) {
      setAiMessage({ type: 'error', text: error.response?.data?.message || 'Cursor test failed' })
    } finally {
      setCursorTesting(false)
      setTimeout(() => setAiMessage({ type: '', text: '' }), 6000)
    }
  }

  const handleTestAiConnection = async () => {
    setAiTesting(true)
    setAiMessage({ type: '', text: '' })
    try {
      const res = await api.post('/admin/settings/ai/test')
      const data = res.data.data
      setAiMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'Connection OK' : 'Connection failed'),
      })
    } catch (error) {
      setAiMessage({ type: 'error', text: error.response?.data?.message || 'Connection test failed' })
    } finally {
      setAiTesting(false)
      setTimeout(() => setAiMessage({ type: '', text: '' }), 6000)
    }
  }

  const handleClearAiCache = async () => {
    setAiClearing(true)
    setAiMessage({ type: '', text: '' })
    try {
      const res = await api.post('/admin/settings/ai/clear-cache')
      setAiMessage({
        type: 'success',
        text: res.data.message || 'AI cache cleared. Try your request again.',
      })
    } catch (error) {
      setAiMessage({ type: 'error', text: error.response?.data?.message || 'Failed to clear AI cache' })
    } finally {
      setAiClearing(false)
      setTimeout(() => setAiMessage({ type: '', text: '' }), 6000)
    }
  }

  const AiToggle = ({ label, hint, checked, onChange, color = 'violet' }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-all ${checked ? `bg-${color}-500` : 'bg-gray-300'}`}
        style={{ backgroundColor: checked ? (color === 'violet' ? '#8b5cf6' : color === 'blue' ? '#3b82f6' : '#22c55e') : undefined }}
      >
        <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${checked ? 'ml-6' : 'ml-0.5'}`} />
      </button>
    </div>
  )

  const providerPreset = aiCatalog?.[aiForm.provider]

  useEffect(() => {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('fame_settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {}
    }
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      // Save to localStorage
      localStorage.setItem('fame_settings', JSON.stringify(settings))
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      
      // Optional: Save to backend if you have a settings API
      // await api.post('/admin/settings', settings)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const handleResetSettings = async () => {
    if (await confirm({
      title: 'Reset settings?',
      message: 'This will restore all settings to their default values.',
      confirmLabel: 'Reset settings',
    })) {
      const defaultSettings = {
        notifications: {
          email: true,
          projectUpdates: true,
          gradeAlerts: true,
          systemAnnouncements: false
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
          loginAlerts: true
        },
        appearance: {
          compactView: false,
          showAnimations: true,
          defaultPageSize: 20
        }
      }
      setSettings(defaultSettings)
      localStorage.removeItem('fame_settings')
      setMessage({ type: 'success', text: 'Settings reset to default!' })
    }
  }

  const handleExportData = async () => {
    try {
      const [usersRes, projectsRes, feedbacksRes] = await Promise.all([
        api.get('/admin/users', { params: { limit: 1000 } }),
        api.get('/admin/projects', { params: { limit: 1000 } }),
        api.get('/admin/feedbacks', { params: { limit: 1000 } })
      ])
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: user?.email,
        users: usersRes.data.data,
        projects: projectsRes.data.data,
        feedbacks: feedbacksRes.data.data
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fame-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Data exported successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        iconColor="text-gray-500"
        title="Settings"
        subtitle="Manage your application preferences"
      >
        <button
          onClick={handleResetSettings}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
        >
          <RefreshCw size={16} /> Reset
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </PageHeader>

      {/* Message Alert */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* AI Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
        <div className="p-5 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-600" />
              <div>
                <h2 className="font-semibold text-gray-800">AI Configuration</h2>
                <p className="text-xs text-gray-500">Manage FAME Assistant, RAG, and Coding Assistant from admin panel</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearAiCache}
                disabled={aiClearing || aiLoading}
                className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw size={16} className={aiClearing ? 'animate-spin' : ''} />
                Clear AI Cache
              </button>
              <button
                type="button"
                onClick={handleTestAiConnection}
                disabled={aiTesting || aiLoading}
                className="px-4 py-2 bg-white border border-violet-200 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-50 disabled:opacity-50 flex items-center gap-2"
              >
                {aiTesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                Test Connection
              </button>
              <button
                type="button"
                onClick={handleSaveAiSettings}
                disabled={aiSaving || aiLoading}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
              >
                {aiSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save AI Settings
              </button>
            </div>
          </div>
        </div>

        {aiMessage.text && (
          <div className={`mx-5 mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
            aiMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {aiMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {aiMessage.text}
          </div>
        )}

        <div className="p-5">
          {aiLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
              <Loader2 size={18} className="animate-spin" /> Loading AI settings…
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Provider</label>
                  <select
                    value={aiForm.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {Object.values(aiCatalog || {}).map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Chat Model</label>
                  <select
                    value={aiForm.chatModel}
                    onChange={(e) => setAiForm({ ...aiForm, chatModel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {(providerPreset?.chatModels || [aiForm.chatModel]).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Coding Assistant Model</label>
                  <select
                    value={aiForm.codingModel}
                    onChange={(e) => setAiForm({ ...aiForm, codingModel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {(providerPreset?.codingModels || providerPreset?.chatModels || [aiForm.codingModel]).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Used for code generation — pick a stronger model for better UI design.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Embedding Model</label>
                  <select
                    value={aiForm.embedModel}
                    onChange={(e) => setAiForm({ ...aiForm, embedModel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    {(providerPreset?.embedModels || [aiForm.embedModel]).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Key size={14} /> API Key
                  </label>
                  <input
                    type="password"
                    value={aiForm.apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={aiForm.hasApiKey ? `Current: ${aiForm.apiKeyMasked}` : 'Paste API key here'}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {aiForm.keySource === 'database' && 'Key stored encrypted in database.'}
                    {aiForm.keySource === 'env' && 'Using .env fallback — save here to manage from admin.'}
                    {aiForm.keySource === 'none' && 'No API key configured yet.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <AiToggle
                  label="FAME Chat (RAG Assistant)"
                  hint="Enable AI-powered chat for admin, teacher, and student"
                  checked={aiForm.chatEnabled}
                  onChange={(v) => setAiForm({ ...aiForm, chatEnabled: v })}
                />
                <AiToggle
                  label="Embeddings (Semantic Search)"
                  hint="Required for RAG training — uses more API quota"
                  checked={aiForm.embeddingEnabled}
                  onChange={(v) => setAiForm({ ...aiForm, embeddingEnabled: v })}
                />
                <AiToggle
                  label="Local Fallback"
                  hint="Use local DB answers when AI is unavailable"
                  checked={aiForm.localFallbackEnabled}
                  onChange={(v) => setAiForm({ ...aiForm, localFallbackEnabled: v })}
                />
                <AiToggle
                  label="Coding Assistant"
                  hint="Enable code generation panel for admin, teacher, and student"
                  checked={aiForm.codingAssistantEnabled}
                  onChange={(v) => setAiForm({ ...aiForm, codingAssistantEnabled: v })}
                />

                {aiForm.codingAssistantEnabled && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">Coding Assistant Engine</p>
                    <select
                      value={aiForm.codingAssistantEngine}
                      onChange={(e) => setAiForm({ ...aiForm, codingAssistantEngine: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                    >
                      <option value="standard">Standard LLM (Gemini / OpenRouter)</option>
                      <option value="cursor">Cursor Cloud Agent (best quality)</option>
                    </select>

                    {aiForm.codingAssistantEngine === 'cursor' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Cursor Model</label>
                          <select
                            value={aiForm.cursorModel}
                            onChange={(e) => setAiForm({ ...aiForm, cursorModel: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                          >
                            <option value="composer-2.5">composer-2.5 (recommended)</option>
                            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                            <option value="gpt-5.3-codex">gpt-5.3-codex</option>
                            <option value="gemini-3.7-flash">gemini-3.7-flash</option>
                            <option value="grok-4.6">grok-4.6</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Key size={12} /> Cursor API Key
                          </label>
                          <input
                            type="password"
                            value={aiForm.cursorApiKey}
                            onChange={(e) => setAiForm({ ...aiForm, cursorApiKey: e.target.value })}
                            placeholder={aiForm.hasCursorApiKey ? `Current: ${aiForm.cursorApiKeyMasked}` : 'cursor_... from cursor.com/dashboard'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Get key from Cursor Dashboard → Integrations. Generation may take 30–90 seconds.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleTestCursorConnection}
                          disabled={cursorTesting}
                          className="text-xs px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                        >
                          {cursorTesting ? 'Testing Cursor…' : 'Test Cursor Connection'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800">Notifications</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Email Notifications</p>
                <p className="text-xs text-gray-500">Receive email updates about your account</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email: !settings.notifications.email }
                })}
                className={`w-12 h-6 rounded-full transition-all ${settings.notifications.email ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${settings.notifications.email ? 'ml-6' : 'ml-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Project Updates</p>
                <p className="text-xs text-gray-500">Get notified about project status changes</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, projectUpdates: !settings.notifications.projectUpdates }
                })}
                className={`w-12 h-6 rounded-full transition-all ${settings.notifications.projectUpdates ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${settings.notifications.projectUpdates ? 'ml-6' : 'ml-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Grade Alerts</p>
                <p className="text-xs text-gray-500">Get notified when grades are posted</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, gradeAlerts: !settings.notifications.gradeAlerts }
                })}
                className={`w-12 h-6 rounded-full transition-all ${settings.notifications.gradeAlerts ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${settings.notifications.gradeAlerts ? 'ml-6' : 'ml-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-purple-500" />
              <h2 className="font-semibold text-gray-800">Security</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500">Add an extra layer of security</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  security: { ...settings.security, twoFactorAuth: !settings.security.twoFactorAuth }
                })}
                className={`w-12 h-6 rounded-full transition-all ${settings.security.twoFactorAuth ? 'bg-purple-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${settings.security.twoFactorAuth ? 'ml-6' : 'ml-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Session Timeout (minutes)</label>
              <select
                value={settings.security.sessionTimeout}
                onChange={(e) => setSettings({
                  ...settings,
                  security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Login Alerts</p>
                <p className="text-xs text-gray-500">Get notified of new logins to your account</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  security: { ...settings.security, loginAlerts: !settings.security.loginAlerts }
                })}
                className={`w-12 h-6 rounded-full transition-all ${settings.security.loginAlerts ? 'bg-purple-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${settings.security.loginAlerts ? 'ml-6' : 'ml-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-green-500" />
              <h2 className="font-semibold text-gray-800">Appearance</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Compact View</p>
                <p className="text-xs text-gray-500">Show more content on screen</p>
              </div>
              <button
                onClick={() => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, compactView: !settings.appearance.compactView }
                })}
                className={`w-12 h-6 rounded-full transition-all ${settings.appearance.compactView ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-all mt-0.5 ${settings.appearance.compactView ? 'ml-6' : 'ml-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Default Items Per Page</label>
              <select
                value={settings.appearance.defaultPageSize}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, defaultPageSize: parseInt(e.target.value) }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300"
              >
                <option value="10">10 items per page</option>
                <option value="20">20 items per page</option>
                <option value="50">50 items per page</option>
                <option value="100">100 items per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800">Data Management</h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download size={18} className="text-blue-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-800">Export All Data</p>
                  <p className="text-xs text-gray-500">Download your data as JSON</p>
                </div>
              </div>
              <Download size={16} className="text-gray-400" />
            </button>
            
            <button
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-not-allowed opacity-60"
              disabled
            >
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-800">Import Data</p>
                  <p className="text-xs text-gray-500">Coming soon</p>
                </div>
              </div>
              <Upload size={16} className="text-gray-400" />
            </button>
            
            <button
              className="w-full flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-not-allowed opacity-60"
              disabled
            >
              <div className="flex items-center gap-3">
                <Trash2 size={18} className="text-red-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-800">Delete All Data</p>
                  <p className="text-xs text-gray-500">Permanently delete all data (Admin only)</p>
                </div>
              </div>
              <Trash2 size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}

export default SettingsPage
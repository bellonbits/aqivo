import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Editor, { DiffEditor } from '@monaco-editor/react'
import {
  Code2, Save, CheckCircle2, AlertCircle, AlertTriangle,
  FileCode, Folder, Plus, Trash2, Copy,
  RotateCcw, UploadCloud, History, Smartphone, Tablet,
  Monitor, RefreshCw, Sliders, GitCompare, ChevronDown,
  ExternalLink, X, Palette, Settings2,
  ShieldCheck, ArrowLeft, Sun, Moon,
  ChevronLeft
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { Button, Modal, PageLoading } from '@/components/ui'

interface ThemeItem {
  id: string
  key: string
  name: string
  industry: string
  description: string
  features: string[]
  theme: Record<string, any>
  is_active: boolean
  stores_count: number
  files_count: number
  has_draft: boolean
  draft_files_count: number
  latest_version: string
  last_published_at: string | null
}

interface FileMeta {
  path: string
  name: string
  extension: string
  size: number
  modified_at: string
  is_editable: boolean
  has_draft: boolean
  is_new_in_draft: boolean
}

interface FileTreeData {
  theme_key: string
  files: FileMeta[]
  categories: {
    templates: FileMeta[]
    styles: FileMeta[]
    scripts: FileMeta[]
    config: FileMeta[]
    assets: FileMeta[]
  }
  theme_tokens: Record<string, any>
}

const STOREFRONT_PAGES = [
  { key: 'index.html', label: 'Home (index.html)' },
  { key: 'product.html', label: 'Products (product.html)' },
  { key: 'product-detail.html', label: 'Product Detail (product-detail.html)' },
  { key: 'service.html', label: 'Services (service.html)' },
  { key: 'service-detail.html', label: 'Service Detail (service-detail.html)' },
  { key: 'cart.html', label: 'Cart (cart.html)' },
  { key: 'checkout.html', label: 'Checkout (checkout.html)' },
  { key: 'receipt.html', label: 'Receipt (receipt.html)' },
]

export function ThemeStudio({ initialThemeKey, onBack }: { initialThemeKey?: string; onBack?: () => void }) {
  const qc = useQueryClient()

  // 1. Fetch available storefront themes & test merchants
  const themesQuery = useQuery({
    queryKey: ['admin-storefronts'],
    queryFn: () => api.get<{ templates: ThemeItem[]; featured: any[]; domains: any[]; test_merchants: any[] }>('/admin/storefronts')
  })

  const themes = themesQuery.data?.templates || []
  const testMerchants = themesQuery.data?.test_merchants || []

  // Active theme selection
  const [activeThemeKey, setActiveThemeKey] = useState<string>(initialThemeKey || 'twosidesboutique')
  useEffect(() => {
    if (initialThemeKey) setActiveThemeKey(initialThemeKey)
    else if (themes.length > 0 && !activeThemeKey) setActiveThemeKey(themes[0].key)
  }, [initialThemeKey, themes])

  const activeTheme = themes.find((t) => t.key === activeThemeKey) || themes[0]

  // 2. Fetch file tree for active theme
  const fileTreeQuery = useQuery({
    queryKey: ['theme-files', activeThemeKey],
    queryFn: () => api.get<FileTreeData>(`/admin/storefronts/themes/${activeThemeKey}/files`),
    enabled: !!activeThemeKey
  })

  // Editor states
  const [openTabs, setOpenTabs] = useState<string[]>(['index.html'])
  const [activeTab, setActiveTab] = useState<string>('index.html')
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [originalContents, setOriginalContents] = useState<Record<string, string>>({})
  const [publishedContents, setPublishedContents] = useState<Record<string, string>>({})
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark')
  const [activeView, setActiveView] = useState<'editor' | 'diff' | 'visual_tokens'>('editor')

  // Preview states
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [previewPage, setPreviewPage] = useState<string>('index.html')
  const [previewMerchantSlug, setPreviewMerchantSlug] = useState<string>('')
  const [previewRefreshKey, setPreviewRefreshKey] = useState<number>(Date.now())
  const [previewDraft, setPreviewDraft] = useState<boolean>(true)

  // Validation & Diagnostics states
  const [diagnostics, setDiagnostics] = useState<{
    valid: boolean
    errors: any[]
    warnings: any[]
    summary: string
    files_checked: number
  } | null>(null)
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState<boolean>(false)

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [publishNotes, setPublishNotes] = useState('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [newFileModalOpen, setNewFileModalOpen] = useState(false)
  const [newFilePath, setNewFilePath] = useState('')
  const [newThemeModalOpen, setNewThemeModalOpen] = useState(false)
  const [themeSettingsModalOpen, setThemeSettingsModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [deleteThemeModalOpen, setDeleteThemeModalOpen] = useState(false)

  // Delete theme mutation
  const deleteThemeMutation = useMutation({
    mutationFn: () => api.del(`/admin/storefronts/themes/${activeThemeKey}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
      setDeleteThemeModalOpen(false)
      setThemeSettingsModalOpen(false)
      const remaining = themes.filter((t) => t.key !== activeThemeKey)
      if (remaining.length > 0) {
        setActiveThemeKey(remaining[0].key)
      } else if (onBack) {
        onBack()
      }
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete theme')
    }
  })

  // Load active tab file content if not cached
  useEffect(() => {
    if (!activeThemeKey || !activeTab) return
    if (fileContents[activeTab] === undefined) {
      api.get<{
        path: string
        language: string
        content: string
        published_content: string
        has_draft: boolean
      }>(`/admin/storefronts/themes/${activeThemeKey}/file?path=${encodeURIComponent(activeTab)}&source=draft`)
        .then((res) => {
          setFileContents((prev) => ({ ...prev, [activeTab]: res.content }))
          setOriginalContents((prev) => ({ ...prev, [activeTab]: res.content }))
          setPublishedContents((prev) => ({ ...prev, [activeTab]: res.published_content }))
        })
        .catch((err) => console.error('Failed to load file content:', err))
    }
  }, [activeThemeKey, activeTab])

  // Track unsaved dirty state
  const isDirty = (path: string) => {
    return fileContents[path] !== undefined && originalContents[path] !== undefined && fileContents[path] !== originalContents[path]
  }

  const dirtyFiles = Object.keys(fileContents).filter((p) => isDirty(p))
  const hasUnsavedChanges = dirtyFiles.length > 0

  // 3. Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (path?: string) => {
      const pathsToSave = path ? [path] : (dirtyFiles.length > 0 ? dirtyFiles : [activeTab])
      for (const p of pathsToSave) {
        if (fileContents[p] !== undefined) {
          await api.put(`/admin/storefronts/themes/${activeThemeKey}/file`, {
            path: p,
            content: fileContents[p]
          })
          setOriginalContents((prev) => ({ ...prev, [p]: fileContents[p] }))
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['theme-files', activeThemeKey] })
      qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
      setPreviewRefreshKey(Date.now())
    }
  })

  // 4. Validate Code Mutation
  const validateMutation = useMutation({
    mutationFn: () => api.post<any>(`/admin/storefronts/themes/${activeThemeKey}/validate`),
    onSuccess: (res) => {
      setDiagnostics(res)
      setBottomDrawerOpen(true)
    }
  })

  // 5. Publish Mutation
  const publishMutation = useMutation({
    mutationFn: async (notes: string) => {
      // First save any unsaved files
      if (hasUnsavedChanges) {
        await saveDraftMutation.mutateAsync()
      }
      return api.post(`/admin/storefronts/themes/${activeThemeKey}/publish`, { notes })
    },
    onSuccess: () => {
      setPublishModalOpen(false)
      setPublishNotes('')
      qc.invalidateQueries({ queryKey: ['theme-files', activeThemeKey] })
      qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
      qc.invalidateQueries({ queryKey: ['theme-versions', activeThemeKey] })
      setPreviewRefreshKey(Date.now())
      // Sync original with fileContents
      setOriginalContents({ ...fileContents })
      setPublishedContents({ ...fileContents })
    }
  })

  // 6. Version History Query
  const versionsQuery = useQuery({
    queryKey: ['theme-versions', activeThemeKey],
    queryFn: () => api.get<any[]>(`/admin/storefronts/themes/${activeThemeKey}/versions`),
    enabled: historyModalOpen
  })

  // 7. Rollback Mutation
  const rollbackMutation = useMutation({
    mutationFn: (vId: string) => api.post(`/admin/storefronts/themes/${activeThemeKey}/rollback/${vId}`),
    onSuccess: () => {
      setHistoryModalOpen(false)
      setFileContents({})
      setOriginalContents({})
      setPublishedContents({})
      qc.invalidateQueries({ queryKey: ['theme-files', activeThemeKey] })
      qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
      setPreviewRefreshKey(Date.now())
    }
  })

  // Open file in tabs
  const handleOpenFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path])
    }
    setActiveTab(path)
    setActiveView('editor')
  }

  // Close tab
  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextTabs = openTabs.filter((t) => t !== path)
    setOpenTabs(nextTabs)
    if (activeTab === path) {
      setActiveTab(nextTabs[nextTabs.length - 1] || '')
    }
  }

  // Create new file
  const handleCreateFile = async () => {
    if (!newFilePath.trim()) return
    try {
      await api.post(`/admin/storefronts/themes/${activeThemeKey}/files/create`, {
        path: newFilePath.trim()
      })
      qc.invalidateQueries({ queryKey: ['theme-files', activeThemeKey] })
      setNewFileModalOpen(false)
      handleOpenFile(newFilePath.trim())
      setNewFilePath('')
    } catch (err: any) {
      alert(err.message || 'Failed to create file')
    }
  }

  // Delete file
  const handleDeleteFile = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to discard draft changes for '${path}'?`)) return
    try {
      await api.del(`/admin/storefronts/themes/${activeThemeKey}/file?path=${encodeURIComponent(path)}`)
      qc.invalidateQueries({ queryKey: ['theme-files', activeThemeKey] })
      handleCloseTab(path, e)
    } catch (err: any) {
      alert(err.message || 'Failed to delete file')
    }
  }

  // Detect file language
  const getLanguage = (path: string) => {
    if (path.endsWith('.html') || path.endsWith('.htm')) return 'html'
    if (path.endsWith('.css')) return 'css'
    if (path.endsWith('.js') || path.endsWith('.mjs')) return 'javascript'
    if (path.endsWith('.json')) return 'json'
    if (path.endsWith('.svg')) return 'xml'
    return 'plaintext'
  }

  // Visual Tokens Update Handler
  const updateVisualToken = (key: string, val: any) => {
    const rawJson = fileContents['theme.json'] || originalContents['theme.json'] || '{}'
    try {
      const parsed = JSON.parse(rawJson)
      parsed[key] = val
      const newStr = JSON.stringify(parsed, null, 2)
      setFileContents((prev) => ({ ...prev, ['theme.json']: newStr }))
    } catch {
      // ignore
    }
  }

  const currentThemeTokens = (() => {
    try {
      return JSON.parse(fileContents['theme.json'] || originalContents['theme.json'] || '{}')
    } catch {
      return fileTreeQuery.data?.theme_tokens || {}
    }
  })()

  // Preview Iframe URL
  const previewUrl = `/ecomm-templates/${activeThemeKey}/${previewPage}?preview=1&draft=${previewDraft ? '1' : '0'}${previewMerchantSlug ? `&bz=${previewMerchantSlug}` : ''}&_t=${previewRefreshKey}`

  if (themesQuery.isLoading || !activeTheme) return <PageLoading />

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-slate-900 text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      
      {/* =========================================================================
          1. TOP DEVELOPER TOOLBAR
         ========================================================================= */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 min-w-0">
        {/* Left: Back, Sidebar Toggle, Theme Selector & Status */}
        <div className="flex items-center gap-2 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Return to Admin Overview"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}

          {/* Toggle File Explorer Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'p-1.5 rounded-lg border text-xs font-bold transition-colors shrink-0',
              sidebarOpen
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            )}
            title={sidebarOpen ? 'Collapse Files Explorer' : 'Expand Files Explorer'}
          >
            <Folder className="size-4 text-amber-400" />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <span className="p-1.5 rounded-lg bg-[#5B21F5]/20 text-[#A78BFA]">
              <Code2 className="size-4" />
            </span>
            <span className="font-extrabold text-sm text-white tracking-tight hidden md:inline">Theme Studio</span>
          </div>

          <span className="text-slate-800 hidden sm:inline">|</span>

          {/* Theme Selector Dropdown */}
          <div className="flex items-center gap-1.5 min-w-0">
            <select
              value={activeThemeKey}
              onChange={(e) => {
                if (hasUnsavedChanges && !confirm('You have unsaved changes in this theme. Switch anyway?')) return
                setActiveThemeKey(e.target.value)
                setOpenTabs(['index.html'])
                setActiveTab('index.html')
                setFileContents({})
                setOriginalContents({})
                setPublishedContents({})
              }}
              className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-[#5B21F5] max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate"
            >
              {themes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name} ({t.key}) {t.has_draft ? '• [Draft]' : ''}
                </option>
              ))}
            </select>

            <span className="text-[11px] font-mono text-slate-400 hidden xl:inline shrink-0">
              {activeTheme.stores_count} live {activeTheme.stores_count === 1 ? 'store' : 'stores'}
            </span>

            {activeTheme.has_draft || hasUnsavedChanges ? (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 shrink-0">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" /> Draft
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                <ShieldCheck className="size-3" /> Live
              </span>
            )}
          </div>
        </div>

        {/* Center: Mode Switchers (Editor / Diff / Visual Tokens) */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveView('editor')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors',
              activeView === 'editor' ? 'bg-[#5B21F5] text-white' : 'text-slate-400 hover:text-white'
            )}
            title="Edit Template Source Code"
          >
            <Code2 className="size-3.5" />
            <span className="hidden xl:inline">Source Code</span>
            <span className="xl:hidden">Code</span>
          </button>
          <button
            onClick={() => setActiveView('diff')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors',
              activeView === 'diff' ? 'bg-[#5B21F5] text-white' : 'text-slate-400 hover:text-white'
            )}
            title="Inspect Live vs Draft Diff"
          >
            <GitCompare className="size-3.5" />
            <span className="hidden xl:inline">Diff Inspector</span>
            <span className="xl:hidden">Diff</span>
          </button>
          <button
            onClick={() => setActiveView('visual_tokens')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors',
              activeView === 'visual_tokens' ? 'bg-[#5B21F5] text-white' : 'text-slate-400 hover:text-white'
            )}
            title="Design Tokens & Theme Schema"
          >
            <Palette className="size-3.5" />
            <span className="hidden xl:inline">Design Tokens</span>
            <span className="xl:hidden">Tokens</span>
          </button>
        </div>

        {/* Right: Actions (Preview Toggle, Validate, History, Save Draft, Publish, Settings, Delete) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Toggle Live Simulator Button */}
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors shrink-0',
              previewOpen
                ? 'bg-[#5B21F5]/20 border-[#5B21F5]/60 text-purple-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            )}
            title={previewOpen ? 'Hide Live Preview' : 'Show Live Preview'}
          >
            <Monitor className="size-3.5" />
            <span className="hidden sm:inline">{previewOpen ? 'Hide Preview' : 'Show Preview'}</span>
          </button>

          {/* Validate Button */}
          <button
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
            className="hidden md:inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors shrink-0"
            title="Run syntax & template structural validation"
          >
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Validate</span>
          </button>

          {/* History Button */}
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors shrink-0"
            title="Version History & Rollback"
          >
            <History className="size-3.5 text-blue-400" />
            <span className="hidden xl:inline">Versions</span>
          </button>

          {/* Save Draft Button */}
          <button
            onClick={() => saveDraftMutation.mutate()}
            disabled={saveDraftMutation.isPending || !hasUnsavedChanges}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0',
              hasUnsavedChanges
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            )}
            title="Save draft changes to isolated workspace"
          >
            <Save className="size-3.5" />
            <span>Save Draft</span>
            {hasUnsavedChanges && (
              <span className="rounded-full bg-slate-950/20 px-1.5 py-0.2 text-[10px]">
                {dirtyFiles.length}
              </span>
            )}
          </button>

          {/* Publish Theme Button - NEVER cut off */}
          <button
            onClick={() => setPublishModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors shadow-sm shrink-0"
            title="Deploy changes to live merchant storefronts"
          >
            <UploadCloud className="size-3.5" />
            <span>Publish</span>
          </button>

          {/* Theme Settings & Options Menu */}
          <button
            onClick={() => setThemeSettingsModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
            title="Theme Settings & Details"
          >
            <Settings2 className="size-4" />
          </button>

          {/* Delete Theme Button */}
          <button
            onClick={() => setDeleteThemeModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors shrink-0"
            title="Delete this template"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN WORKSPACE (LEFT EXPLORER | CENTER EDITOR | RIGHT LIVE PREVIEW)
          ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ----------------- LEFT SIDEBAR: FILE EXPLORER ----------------- */}
        <aside
          className={cn(
            'bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 select-none transition-all duration-200',
            sidebarOpen ? 'w-56 lg:w-60' : 'w-0 overflow-hidden border-r-0'
          )}
        >
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 truncate">
              <Folder className="size-3.5 text-amber-400 shrink-0" /> Files & Assets
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNewFileModalOpen(true)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Create new template or style file"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono text-xs">
            {/* Templates Section */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 flex items-center gap-1">
                <ChevronDown className="size-3" /> Templates (HTML)
              </div>
              <div className="space-y-0.5 mt-0.5">
                {fileTreeQuery.data?.categories.templates.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => handleOpenFile(f.path)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs group transition-colors',
                      activeTab === f.path ? 'bg-[#5B21F5]/20 text-white font-bold border-l-2 border-[#5B21F5]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FileCode className="size-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {isDirty(f.path) && <span className="size-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                      {f.has_draft && !isDirty(f.path) && <span className="size-1.5 rounded-full bg-blue-400 shrink-0" title="Draft saved" />}
                      {(f.has_draft || f.is_new_in_draft) && (
                        <span
                          onClick={(e) => handleDeleteFile(f.path, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-opacity"
                          title="Discard draft changes"
                        >
                          <Trash2 className="size-3" />
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Styles Section */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 flex items-center gap-1">
                <ChevronDown className="size-3" /> Styles (CSS)
              </div>
              <div className="space-y-0.5 mt-0.5">
                {fileTreeQuery.data?.categories.styles.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => handleOpenFile(f.path)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs group transition-colors',
                      activeTab === f.path ? 'bg-[#5B21F5]/20 text-white font-bold border-l-2 border-[#5B21F5]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FileCode className="size-3.5 text-pink-400 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {isDirty(f.path) && <span className="size-2 rounded-full bg-amber-400 shrink-0" />}
                      {f.has_draft && !isDirty(f.path) && <span className="size-1.5 rounded-full bg-blue-400 shrink-0" />}
                      {(f.has_draft || f.is_new_in_draft) && (
                        <span
                          onClick={(e) => handleDeleteFile(f.path, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-opacity"
                          title="Discard draft changes"
                        >
                          <Trash2 className="size-3" />
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scripts Section */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 flex items-center gap-1">
                <ChevronDown className="size-3" /> Scripts (JS)
              </div>
              <div className="space-y-0.5 mt-0.5">
                {fileTreeQuery.data?.categories.scripts.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => handleOpenFile(f.path)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs group transition-colors',
                      activeTab === f.path ? 'bg-[#5B21F5]/20 text-white font-bold border-l-2 border-[#5B21F5]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FileCode className="size-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {isDirty(f.path) && <span className="size-2 rounded-full bg-amber-400 shrink-0" />}
                      {f.has_draft && !isDirty(f.path) && <span className="size-1.5 rounded-full bg-blue-400 shrink-0" />}
                      {(f.has_draft || f.is_new_in_draft) && (
                        <span
                          onClick={(e) => handleDeleteFile(f.path, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-red-400 transition-opacity"
                          title="Discard draft changes"
                        >
                          <Trash2 className="size-3" />
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Config & Design Tokens */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 flex items-center gap-1">
                <ChevronDown className="size-3" /> Configuration
              </div>
              <div className="space-y-0.5 mt-0.5">
                {fileTreeQuery.data?.categories.config.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => handleOpenFile(f.path)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs group transition-colors',
                      activeTab === f.path ? 'bg-[#5B21F5]/20 text-white font-bold border-l-2 border-[#5B21F5]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Sliders className="size-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {isDirty(f.path) && <span className="size-2 rounded-full bg-amber-400 shrink-0" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick theme switcher button */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80">
            <button
              onClick={() => setNewThemeModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700/80 transition-colors"
            >
              <Plus className="size-3.5" /> Create New Theme
            </button>
          </div>
        </aside>

        {/* ----------------- CENTER WORKSPACE: MONACO EDITOR / DIFF / VISUAL ----------------- */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-slate-900 overflow-hidden">
          
          {/* Tabs Bar */}
          <div className="h-10 bg-slate-950/60 border-b border-slate-800 flex items-center px-2 gap-1 overflow-x-auto shrink-0 select-none">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="h-7 px-2 mr-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold shrink-0 transition-colors"
                title="Expand File Explorer"
              >
                <Folder className="size-3 text-amber-400" />
                <span className="hidden sm:inline">Files</span>
              </button>
            )}

            {openTabs.map((tab) => (
              <div
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveView('editor') }}
                className={cn(
                  'h-8 px-3 rounded-t-lg flex items-center gap-2 text-xs font-mono cursor-pointer border-t-2 transition-colors',
                  activeTab === tab && activeView === 'editor'
                    ? 'bg-slate-900 text-white font-bold border-[#5B21F5]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border-transparent'
                )}
              >
                <FileCode className="size-3.5 opacity-70" />
                <span>{tab}</span>
                {isDirty(tab) && (
                  <span className="size-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
                )}
                {openTabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab, e)}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-white"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}

            <div className="ml-auto flex items-center gap-1.5 pr-2 shrink-0">
              {!previewOpen && (
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="h-7 px-2 rounded bg-[#5B21F5]/10 border border-[#5B21F5]/30 text-purple-300 hover:bg-[#5B21F5]/20 flex items-center gap-1 text-xs font-bold transition-colors"
                  title="Show Live Preview Simulator"
                >
                  <Monitor className="size-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              )}
              <button
                onClick={() => setEditorTheme(editorTheme === 'vs-dark' ? 'light' : 'vs-dark')}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title={`Switch to ${editorTheme === 'vs-dark' ? 'Light' : 'Dark'} theme`}
              >
                {editorTheme === 'vs-dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Active View Container */}
          <div className="flex-1 relative overflow-hidden bg-slate-900">
            {/* VIEW 1: Standard Monaco Code Editor */}
            {activeView === 'editor' && (
              <div className="absolute inset-0">
                <Editor
                  height="100%"
                  language={getLanguage(activeTab)}
                  value={fileContents[activeTab] ?? ''}
                  theme={editorTheme}
                  onChange={(val) => {
                    setFileContents((prev) => ({ ...prev, [activeTab]: val || '' }))
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    renderWhitespace: 'selection'
                  }}
                />
              </div>
            )}

            {/* VIEW 2: Monaco Side-by-Side Diff Inspector */}
            {activeView === 'diff' && (
              <div className="absolute inset-0 flex flex-col">
                <div className="p-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">Left: Currently Published Live</span>
                    <span>→</span>
                    <span className="text-emerald-400 font-bold">Right: Draft Workspace</span>
                  </div>
                  <span className="text-slate-400 font-mono">Viewing diff for: {activeTab}</span>
                </div>
                <div className="flex-1">
                  <DiffEditor
                    height="100%"
                    language={getLanguage(activeTab)}
                    original={publishedContents[activeTab] || ''}
                    modified={fileContents[activeTab] || originalContents[activeTab] || ''}
                    theme={editorTheme}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      automaticLayout: true,
                      wordWrap: 'on'
                    }}
                  />
                </div>
              </div>
            )}

            {/* VIEW 3: Visual Design Tokens Editor (synchronized with theme.json) */}
            {activeView === 'visual_tokens' && (
              <div className="absolute inset-0 p-6 overflow-y-auto bg-slate-950">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Palette className="size-5 text-[#A78BFA]" /> Storefront Design System Tokens
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Visual customization for {activeTheme.name}. Adjust colors, fonts, border radii, and section layouts. Changes are automatically written to <code className="text-emerald-400">theme.json</code> in your draft.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 p-5 bg-slate-900 border border-slate-800 rounded-xl">
                    {/* Accent Color */}
                    <div>
                      <label className="text-xs font-bold text-slate-300">Accent Brand Color</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={currentThemeTokens.accent || '#5B21F5'}
                          onChange={(e) => updateVisualToken('accent', e.target.value)}
                          className="size-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={currentThemeTokens.accent || '#5B21F5'}
                          onChange={(e) => updateVisualToken('accent', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Background Color */}
                    <div>
                      <label className="text-xs font-bold text-slate-300">Background Color</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={currentThemeTokens.bg || '#FFFFFF'}
                          onChange={(e) => updateVisualToken('bg', e.target.value)}
                          className="size-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={currentThemeTokens.bg || '#FFFFFF'}
                          onChange={(e) => updateVisualToken('bg', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Text (Ink) Color */}
                    <div>
                      <label className="text-xs font-bold text-slate-300">Main Text (Ink) Color</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={currentThemeTokens.ink || '#0B1736'}
                          onChange={(e) => updateVisualToken('ink', e.target.value)}
                          className="size-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={currentThemeTokens.ink || '#0B1736'}
                          onChange={(e) => updateVisualToken('ink', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Border Radius */}
                    <div>
                      <label className="text-xs font-bold text-slate-300">Card & Button Radius</label>
                      <select
                        value={currentThemeTokens.radius || '12px'}
                        onChange={(e) => updateVisualToken('radius', e.target.value)}
                        className="mt-1.5 w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-bold"
                      >
                        <option value="0px">Square (0px)</option>
                        <option value="6px">Subtle (6px)</option>
                        <option value="12px">Standard Modern (12px)</option>
                        <option value="20px">Rounded Luxe (20px)</option>
                        <option value="9999px">Pill (Full)</option>
                      </select>
                    </div>

                    {/* Font Family */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Heading Font</label>
                      <select
                        value={currentThemeTokens.font_display || "'Inter', system-ui, sans-serif"}
                        onChange={(e) => updateVisualToken('font_display', e.target.value)}
                        className="mt-1.5 w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-bold"
                      >
                        <option value="'Inter', system-ui, sans-serif">Inter (Modern Clean)</option>
                        <option value="'Plus Jakarta Sans', system-ui, sans-serif">Plus Jakarta Sans (Contemporary Tech)</option>
                        <option value="'Outfit', system-ui, sans-serif">Outfit (Bold Display)</option>
                        <option value="'Playfair Display', serif">Playfair Display (Editorial Luxury)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        saveDraftMutation.mutate('theme.json')
                        setActiveView('editor')
                      }}
                    >
                      Save & Apply Tokens
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Bottom Panel: Diagnostics & Validation */}
          {bottomDrawerOpen && (
            <div className="h-44 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                <span className="text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  Code Diagnostics & Syntax Validation Results
                </span>
                <button
                  onClick={() => setBottomDrawerOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-mono">
                {diagnostics?.valid ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{diagnostics.summary} (Checked {diagnostics.files_checked} files)</span>
                  </div>
                ) : (
                  <>
                    {diagnostics?.errors.map((err: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => handleOpenFile(err.file)}
                        className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-2 cursor-pointer hover:bg-red-500/20"
                      >
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{err.file} (Line {err.line}):</span> {err.message}
                        </div>
                      </div>
                    ))}
                    {diagnostics?.warnings.map((w: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => handleOpenFile(w.file)}
                        className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2 cursor-pointer hover:bg-amber-500/20"
                      >
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{w.file}:</span> {w.message}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ----------------- RIGHT PANEL: LIVE STOREFRONT PREVIEW ----------------- */}
        {previewOpen && (
          <section className="w-[360px] md:w-[400px] lg:w-[440px] xl:w-[480px] bg-slate-950 flex flex-col shrink-0 border-l border-slate-800 overflow-hidden">
            
            {/* Top Preview Controls Toolbar */}
            <div className="p-2.5 border-b border-slate-800 flex flex-col gap-2 shrink-0 bg-slate-950">
              <div className="flex items-center justify-between gap-2">
                {/* Responsive Device Toggles */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={cn(
                      'p-1.5 rounded text-xs font-bold transition-colors',
                      previewDevice === 'desktop' ? 'bg-[#5B21F5] text-white' : 'text-slate-400 hover:text-white'
                    )}
                    title="Desktop 100% View"
                  >
                    <Monitor className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={cn(
                      'p-1.5 rounded text-xs font-bold transition-colors',
                      previewDevice === 'tablet' ? 'bg-[#5B21F5] text-white' : 'text-slate-400 hover:text-white'
                    )}
                    title="Tablet 768px View"
                  >
                    <Tablet className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={cn(
                      'p-1.5 rounded text-xs font-bold transition-colors',
                      previewDevice === 'mobile' ? 'bg-[#5B21F5] text-white' : 'text-slate-400 hover:text-white'
                    )}
                    title="Mobile 375px View"
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>

                {/* Draft vs Published Preview Toggle */}
                <button
                  onClick={() => {
                    setPreviewDraft(!previewDraft)
                    setPreviewRefreshKey(Date.now())
                  }}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors shrink-0',
                    previewDraft
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  )}
                  title="Toggle between previewing Draft edits or Published live version"
                >
                  {previewDraft ? 'Draft Preview' : 'Live Preview'}
                </button>

                {/* Reload, Open External & Close Panel */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewRefreshKey(Date.now())}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Reload Preview"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Open in new window"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Close Preview Panel"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>

            {/* Page & Merchant Selectors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Page Select */}
              <select
                value={previewPage}
                onChange={(e) => setPreviewPage(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 font-bold text-[11px]"
              >
                {STOREFRONT_PAGES.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>

              {/* Simulated Test Store */}
              <select
                value={previewMerchantSlug}
                onChange={(e) => {
                  setPreviewMerchantSlug(e.target.value)
                  setPreviewRefreshKey(Date.now())
                }}
                className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2 py-1 font-bold text-[11px]"
              >
                <option value="">Aqivo Demo Store</option>
                {testMerchants.map((m) => (
                  <option key={m.id} value={m.slug}>
                    {m.name} (/{m.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Iframe Viewport Container */}
          <div className="flex-1 bg-slate-900/60 p-3 flex justify-center items-start overflow-auto">
            <div
              className={cn(
                'rounded-xl border border-slate-800 bg-white shadow-2xl transition-all duration-300 overflow-hidden flex flex-col',
                previewDevice === 'mobile' && 'w-[375px] h-[660px]',
                previewDevice === 'tablet' && 'w-[768px] max-w-full h-[680px]',
                previewDevice === 'desktop' && 'w-full h-full min-h-[580px]'
              )}
            >
              {/* Browser Simulation Header */}
              <div className="h-7 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0">
                <div className="flex gap-1">
                  <span className="size-2 rounded-full bg-red-400" />
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 text-center truncate text-[10px] font-mono text-slate-500 bg-white rounded px-2 py-0.5 border border-slate-200">
                  {previewUrl.split('?')[0]}
                </div>
              </div>

              {/* Sandboxed Live Storefront Iframe */}
              <iframe
                key={previewRefreshKey}
                src={previewUrl}
                sandbox="allow-scripts allow-forms allow-same-origin"
                className="w-full flex-1 border-0 bg-white"
                title="Storefront Preview"
              />
            </div>
          </div>
        </section>
        )}
      </div>

      {/* =========================================================================
          3. MODALS (PUBLISH, HISTORY, NEW THEME, NEW FILE, THEME SETTINGS)
         ========================================================================= */}
      
      {/* A. PUBLISH CONFIRMATION MODAL */}
      <Modal
        open={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title={`Publish ${activeTheme.name} to Live Production`}
      >
        <div className="space-y-4 text-slate-900 text-sm">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-600" />
              Publishing will deploy your draft template to all {activeTheme.stores_count} live storefronts.
            </p>
            <p className="mt-1 text-amber-700">
              A permanent version snapshot will be saved for audit history, and you can roll back to previous versions at any time.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Release Notes / Changelog (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Redesigned product grid and improved mobile cart layout"
              value={publishNotes}
              onChange={(e) => setPublishNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#5B21F5]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={publishMutation.isPending}
              onClick={() => publishMutation.mutate(publishNotes)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm & Publish
            </Button>
          </div>
        </div>
      </Modal>

      {/* B. VERSION HISTORY & ROLLBACK DRAWER / MODAL */}
      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Version History & Backups: ${activeTheme.name}`}
        wide
      >
        <div className="space-y-4 text-slate-900">
          <p className="text-xs text-slate-500">
            Every published release is snapshotted. You can inspect changelogs and roll back to any previous version with 1-click.
          </p>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {versionsQuery.data?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No previous version snapshots recorded yet. The first publish will create v1.0.
              </div>
            ) : (
              versionsQuery.data?.map((v: any) => (
                <div key={v.version_id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{v.version_num}</span>
                      <span className="text-xs font-mono text-slate-400">{new Date(v.created_at).toLocaleString()}</span>
                      <span className="text-xs text-slate-500 font-medium">by {v.created_by}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{v.notes || 'No release notes provided.'}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {v.files_changed} files changed • +{v.additions || 0} / -{v.deletions || 0} lines
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={rollbackMutation.isPending}
                    onClick={() => {
                      if (confirm(`Roll back ${activeTheme.name} to ${v.version_num}? Current live storefronts will be restored to this snapshot.`)) {
                        rollbackMutation.mutate(v.version_id)
                      }
                    }}
                    className="shrink-0"
                  >
                    <RotateCcw className="size-3" /> Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* C. CREATE NEW FILE MODAL */}
      <Modal
        open={newFileModalOpen}
        onClose={() => setNewFileModalOpen(false)}
        title="Add New Template or Asset File"
      >
        <div className="space-y-4 text-slate-900 text-sm">
          <div>
            <label className="text-xs font-bold text-slate-700">Relative File Path</label>
            <input
              type="text"
              placeholder="e.g. styles/custom.css or promo.html"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#5B21F5]"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Supported extensions: .html, .css, .js, .json, .svg
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNewFileModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateFile}>Create File</Button>
          </div>
        </div>
      </Modal>

      {/* D. CREATE NEW THEME MODAL */}
      <Modal
        open={newThemeModalOpen}
        onClose={() => setNewThemeModalOpen(false)}
        title="Create New Storefront Theme"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            try {
              const res = await api.post<any>('/admin/storefronts/themes', {
                key: fd.get('key'),
                name: fd.get('name'),
                industry: fd.get('industry'),
                description: fd.get('description'),
                clone_from: fd.get('clone_from') || null
              })
              qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
              setActiveThemeKey(res.key)
              setNewThemeModalOpen(false)
            } catch (err: any) {
              alert(err.message || 'Failed to create theme')
            }
          }}
          className="space-y-3 text-slate-900 text-xs"
        >
          <div>
            <label className="font-bold">Theme Name</label>
            <input name="name" required placeholder="e.g. Savanna Luxe" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs" />
          </div>
          <div>
            <label className="font-bold">Theme Key (Folder Slug)</label>
            <input name="key" required placeholder="e.g. savannaluxe" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono" />
          </div>
          <div>
            <label className="font-bold">Industry Sector</label>
            <select name="industry" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs">
              <option value="retail">Retail & E-commerce</option>
              <option value="restaurant">Food & Dining</option>
              <option value="beauty">Beauty & Salon</option>
              <option value="services">Services & Booking</option>
            </select>
          </div>
          <div>
            <label className="font-bold">Starter Template</label>
            <select name="clone_from" className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs">
              <option value="">Start from clean starter template</option>
              {themes.map((t) => (
                <option key={t.key} value={t.key}>Clone from existing: {t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold">Description</label>
            <textarea name="description" rows={2} placeholder="Theme description..." className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNewThemeModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Theme</Button>
          </div>
        </form>
      </Modal>

      {/* E. THEME SETTINGS & METADATA MODAL */}
      <Modal
        open={themeSettingsModalOpen}
        onClose={() => setThemeSettingsModalOpen(false)}
        title={`Theme Settings: ${activeTheme.name}`}
      >
        <div className="space-y-4 text-slate-900 text-xs">
          <div>
            <label className="font-bold">Theme Name</label>
            <input
              type="text"
              defaultValue={activeTheme.name}
              id="theme-rename-input"
              className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="font-bold">Industry Sector</label>
            <select
              defaultValue={activeTheme.industry}
              id="theme-industry-input"
              className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs"
            >
              <option value="retail">Retail & E-commerce</option>
              <option value="restaurant">Food & Dining</option>
              <option value="beauty">Beauty & Salon</option>
              <option value="services">Services & Booking</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div>
              <span className="font-bold text-slate-900 block">Theme Visibility</span>
              <span className="text-slate-500 text-[11px]">
                {activeTheme.is_active ? 'Active & visible in merchant template picker' : 'Archived (hidden from merchants)'}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await api.patch(`/admin/storefronts/themes/${activeTheme.key}`, {
                  is_active: !activeTheme.is_active
                })
                qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold border',
                activeTheme.is_active
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              )}
            >
              {activeTheme.is_active ? 'Active' : 'Archived'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="font-bold text-red-600 block">Danger Zone</span>
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-red-900 text-xs">Delete Theme Template</p>
                <p className="text-[11px] text-red-700">
                  {activeTheme.stores_count > 0
                    ? `Used by ${activeTheme.stores_count} live storefronts (cannot delete)`
                    : 'Permanently remove from catalog and archive files'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteThemeModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                const newName = prompt(`Enter duplicate name for ${activeTheme.name}:`, `${activeTheme.name} Copy`)
                if (!newName) return
                const newKey = prompt(`Enter unique key for duplicate:`, `${activeTheme.key}_copy`)
                if (!newKey) return
                try {
                  const res = await api.post<any>(`/admin/storefronts/themes/${activeTheme.key}/duplicate`, {
                    new_name: newName,
                    new_key: newKey
                  })
                  qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
                  setActiveThemeKey(res.key)
                  setThemeSettingsModalOpen(false)
                } catch (err: any) {
                  alert(err.message || 'Failed to duplicate theme')
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B21F5] hover:underline"
            >
              <Copy className="size-3.5" /> Duplicate Theme
            </button>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setThemeSettingsModalOpen(false)}>Close</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  const nameVal = (document.getElementById('theme-rename-input') as HTMLInputElement)?.value
                  const indVal = (document.getElementById('theme-industry-input') as HTMLSelectElement)?.value
                  if (nameVal) {
                    await api.patch(`/admin/storefronts/themes/${activeTheme.key}`, {
                      name: nameVal,
                      industry: indVal
                    })
                    qc.invalidateQueries({ queryKey: ['admin-storefronts'] })
                    setThemeSettingsModalOpen(false)
                  }
                }}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* F. DELETE THEME CONFIRMATION MODAL */}
      <Modal
        open={deleteThemeModalOpen}
        onClose={() => setDeleteThemeModalOpen(false)}
        title={`Delete Theme: ${activeTheme.name}`}
      >
        <div className="space-y-4 text-slate-900 text-xs">
          {activeTheme.stores_count > 0 ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-bold text-sm text-amber-900">Theme In Use By Merchants</p>
                  <p>
                    Theme <strong>{activeTheme.name}</strong> is currently powering <strong>{activeTheme.stores_count} live storefront(s)</strong>.
                  </p>
                  <p>
                    To prevent active customer storefront outages, templates in use cannot be deleted. You can archive the theme instead or reassign stores to another template.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => setDeleteThemeModalOpen(false)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
                <Trash2 className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 space-y-1">
                  <p className="font-bold text-sm text-red-900">Are you sure you want to delete this theme?</p>
                  <p>
                    Theme <strong>{activeTheme.name}</strong> (<code className="font-mono text-red-900">/{activeTheme.key}</code>) and its workspace will be archived and removed from the active catalog.
                  </p>
                  <p className="text-[11px] text-red-700">
                    A safe copy of all template files will be preserved in server backups.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setDeleteThemeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={deleteThemeMutation.isPending}
                  onClick={() => deleteThemeMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  {deleteThemeMutation.isPending ? 'Deleting...' : 'Delete Theme'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  )
}

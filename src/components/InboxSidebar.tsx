'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface InboxItem {
  slug: string
  title: string
  date?: string
  mtime: number
}

function formatDate(mtime: number): string {
  const diffDays = Math.floor((Date.now() - mtime) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  const d = new Date(mtime)
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

interface Props {
  open: boolean
  onToggle: () => void
}

export default function InboxSidebar({ open, onToggle }: Props) {
  const [items, setItems] = useState<InboxItem[]>([])
  const [quickTitle, setQuickTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    const res = await fetch('/api/inbox')
    const data = await res.json()
    setItems(data.items ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleQuickSave() {
    if (!quickTitle.trim() || saving) return
    setSaving(true)
    const res = await fetch('/api/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickTitle.trim(), body: '' }),
    })
    if (res.ok) {
      setQuickTitle('')
      await load()
      window.dispatchEvent(new CustomEvent('inbox:updated'))
    }
    setSaving(false)
  }

  async function handleArchive(slug: string) {
    setArchiving(slug)
    const res = await fetch(`/api/inbox/${encodeURIComponent(slug)}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
      window.dispatchEvent(new CustomEvent('inbox:updated'))
    }
    setArchiving(null)
  }

  return (
    <aside
      className={`flex-shrink-0 bg-white border-l border-slate-100 flex flex-col transition-all duration-200 overflow-hidden ${
        open ? 'w-72' : 'w-10'
      }`}
    >
      {open ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-sm font-bold text-slate-800 flex-1">Inbox</h2>
            {items.length > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full tabular-nums">
                {items.length}
              </span>
            )}
            <button
              onClick={onToggle}
              title="Collapse"
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Quick capture */}
          <div className="px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-slate-400 flex-shrink-0">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <input
                type="text"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickSave() }}
                placeholder="Capture a note..."
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none min-w-0"
              />
              {quickTitle && (
                <button
                  onClick={handleQuickSave}
                  disabled={saving}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex-shrink-0 disabled:opacity-40"
                >
                  {saving ? '…' : 'Add'}
                </button>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <span className="text-2xl mb-2">📥</span>
                <p className="text-xs text-slate-400">Inbox zero</p>
              </div>
            ) : (
              <ul>
                {items.map((item, idx) => (
                  <li
                    key={item.slug}
                    className={`group flex items-start gap-1.5 px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                      idx < items.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    <Link
                      href={`/inbox/${encodeURIComponent(item.slug)}`}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-slate-700 leading-snug line-clamp-2 group-hover:text-slate-900 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.date ?? formatDate(item.mtime)}
                      </p>
                    </Link>
                    <button
                      onClick={() => handleArchive(item.slug)}
                      disabled={archiving === item.slug}
                      title="Archive"
                      className="mt-0.5 p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40 flex-shrink-0"
                    >
                      {archiving === item.slug ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.2} />
                          <path d="M21 12c0-4.97-4.03-9-9-9" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        /* Collapsed strip */
        <div className="flex flex-col items-center pt-3 gap-3">
          <button
            onClick={onToggle}
            title="Open inbox"
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-slate-400">
              <path d="M22 12h-6l-2 3H10l-2-3H2" strokeLinejoin="round" />
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" strokeLinejoin="round" />
            </svg>
            {items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums leading-none">
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

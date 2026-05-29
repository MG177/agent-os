'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Entry {
  name: string
  type: 'directory' | 'file'
}

const SECTIONS = ['Projects', 'Areas', 'Resources', 'Ideas'] as const
type Section = typeof SECTIONS[number]

const SECTION_META: Record<Section, { color: string; dot: string }> = {
  Projects: { color: 'text-blue-600', dot: 'bg-blue-500' },
  Areas:    { color: 'text-violet-600', dot: 'bg-violet-500' },
  Resources:{ color: 'text-emerald-600', dot: 'bg-emerald-500' },
  Ideas:    { color: 'text-amber-500', dot: 'bg-amber-400' },
}

function FolderIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} className={className ?? 'w-3.5 h-3.5'}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinejoin="round" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className ?? 'w-3.5 h-3.5'}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className ?? 'w-3 h-3'}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity={0.2} />
      <path d="M21 12c0-4.97-4.03-9-9-9" />
    </svg>
  )
}

export default function BrowseSidebar() {
  const pathname = usePathname()

  // Parse current path: /browse/Projects/some-folder/file.md → ['Projects', 'some-folder', 'file.md']
  const pathParts = pathname.startsWith('/browse/')
    ? pathname.slice('/browse/'.length).split('/').map(s => decodeURIComponent(s)).filter(Boolean)
    : []
  const activeSection = (SECTIONS as readonly string[]).includes(pathParts[0])
    ? pathParts[0] as Section
    : null

  const [expanded, setExpanded] = useState<Set<Section>>(new Set())
  const [entries, setEntries] = useState<Partial<Record<Section, Entry[]>>>({})
  const [loading, setLoading] = useState<Set<Section>>(new Set())

  const loadSection = useCallback(async (section: Section) => {
    if (entries[section] !== undefined) return
    setLoading(prev => new Set([...prev, section]))
    try {
      const res = await fetch(`/api/browse/${section}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(prev => ({ ...prev, [section]: data.entries ?? [] }))
      }
    } finally {
      setLoading(prev => { const s = new Set(prev); s.delete(section); return s })
    }
  }, [entries])

  // Auto-expand the active section
  useEffect(() => {
    if (activeSection && !expanded.has(activeSection)) {
      setExpanded(prev => new Set([...prev, activeSection]))
      loadSection(activeSection)
    }
  }, [activeSection]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSection(section: Section) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
        loadSection(section)
      }
      return next
    })
  }

  return (
    <nav className="h-full flex flex-col select-none">
      {/* Vault label */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <span className="app-section-label">Vault</span>
      </div>

      {/* Section tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {SECTIONS.map(section => {
          const isExpanded = expanded.has(section)
          const isActive = activeSection === section
          const isLoading = loading.has(section)
          const sectionEntries = entries[section]
          const meta = SECTION_META[section]

          return (
            <div key={section}>
              {/* Section row */}
              <button
                onClick={() => toggleSection(section)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors rounded-lg mx-1 ${
                  isActive && !isExpanded ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <ChevronRight
                  className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 text-slate-400 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                <span className={`text-sm font-semibold flex-1 ${isActive ? meta.color : 'text-slate-700'}`}>
                  {section}
                </span>
                {isLoading && <Spinner />}
                {!isLoading && sectionEntries && (
                  <span className="text-[10px] text-slate-400 tabular-nums">{sectionEntries.length}</span>
                )}
              </button>

              {/* Section children */}
              {isExpanded && (
                <div className="mb-1">
                  {isLoading && !sectionEntries && (
                    <div className="flex items-center gap-2 pl-10 py-1.5 text-xs text-slate-400">
                      <Spinner /> Loading...
                    </div>
                  )}
                  {sectionEntries?.length === 0 && (
                    <p className="pl-10 py-1.5 text-xs text-slate-400">Empty</p>
                  )}
                  {sectionEntries?.map(entry => {
                    const encodedName = encodeURIComponent(entry.name)
                    const href = `/browse/${section}/${encodedName}`
                    const isItemActive =
                      pathname === href ||
                      pathname.startsWith(`/browse/${section}/${encodedName}/`)
                    const displayName = entry.name.replace(/\.md$/, '')

                    return (
                      <Link
                        key={entry.name}
                        href={href}
                        className={`flex items-center gap-2 pl-8 pr-3 py-1.5 mx-1 rounded-lg transition-colors text-sm ${
                          isItemActive
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        style={{ width: 'calc(100% - 8px)' }}
                        title={displayName}
                      >
                        <span className={`flex-shrink-0 ${isItemActive ? 'text-blue-500' : 'text-slate-400'}`}>
                          {entry.type === 'directory'
                            ? <FolderIcon filled={isItemActive} />
                            : <FileIcon />}
                        </span>
                        <span className="truncate">{displayName}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

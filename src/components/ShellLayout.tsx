'use client'

import { useState } from 'react'
import BrowseSidebar from './BrowseSidebar'
import InboxSidebar from './InboxSidebar'

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [inboxOpen, setInboxOpen] = useState(true)

  return (
    <div className="flex min-h-screen md:h-screen bg-slate-50">
      {/* Left sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white border-r border-slate-100 overflow-hidden">
        <BrowseSidebar />
      </aside>

      {/* Center — single render, always visible */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
        {children}
      </div>

      {/* Right inbox sidebar — desktop only */}
      <div className="hidden md:flex flex-shrink-0">
        <InboxSidebar open={inboxOpen} onToggle={() => setInboxOpen(v => !v)} />
      </div>
    </div>
  )
}

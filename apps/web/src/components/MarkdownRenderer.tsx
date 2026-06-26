'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const mermaid = (await import('mermaid')).default
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      try {
        const { svg } = await mermaid.render(id, code)
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
        }
      } catch {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="text-xs text-red-500 whitespace-pre-wrap">${code}</pre>`
        }
      }
    }
    render()
    return () => { cancelled = true }
  }, [code])

  return <div ref={ref} className="my-4 overflow-x-auto flex justify-center" />
}

export type MarkdownVariant = 'default' | 'compact'

interface Props {
  content: string
  variant?: MarkdownVariant
}

function markdownComponents(variant: MarkdownVariant) {
  const compact = variant === 'compact'
  return {
    h1: ({ children }: { children?: ReactNode }) => (
      <h1
        className={
          compact
            ? 'mb-2 mt-3 text-sm font-bold text-slate-900 first:mt-0'
            : 'mb-3 mt-6 text-2xl font-bold text-slate-900 first:mt-0'
        }
      >
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: ReactNode }) => (
      <h2
        className={
          compact
            ? 'mb-1.5 mt-2.5 text-sm font-bold text-slate-800 first:mt-0'
            : 'mb-2 mt-5 text-xl font-bold text-slate-800'
        }
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3
        className={
          compact
            ? 'mb-1 mt-2 text-sm font-semibold text-slate-800 first:mt-0'
            : 'mb-1.5 mt-4 text-base font-semibold text-slate-700'
        }
      >
        {children}
      </h3>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p
        className={
          compact
            ? 'mb-2 text-sm leading-relaxed text-slate-700 last:mb-0'
            : 'mb-3 text-sm leading-relaxed text-slate-700'
        }
      >
        {children}
      </p>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul
        className={
          compact
            ? 'mb-2 list-disc space-y-1 pl-4 text-sm text-slate-700 last:mb-0'
            : 'mb-3 list-inside list-disc space-y-1 text-sm text-slate-700'
        }
      >
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol
        className={
          compact
            ? 'mb-2 list-decimal space-y-1 pl-4 text-sm text-slate-700 last:mb-0'
            : 'mb-3 list-inside list-decimal space-y-1 text-sm text-slate-700'
        }
      >
        {children}
      </ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="text-sm leading-relaxed text-slate-700 [&>p]:mb-1 [&>p]:last:mb-0">
        {children}
      </li>
    ),
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold text-slate-900">{children}</strong>
    ),
    em: ({ children }: { children?: ReactNode }) => (
      <em className="italic text-slate-600">{children}</em>
    ),
    code: ({
      children,
      className,
    }: {
      children?: ReactNode
      className?: string
    }) => {
      const lang = className?.replace('language-', '') ?? ''
      if (lang === 'mermaid') {
        return <MermaidBlock code={String(children).trim()} />
      }
      const isBlock = Boolean(className)
      return isBlock ? (
        <code
          className={
            compact
              ? 'mb-2 block overflow-x-auto whitespace-pre rounded-xl bg-slate-100 px-3 py-2 text-xs font-mono text-slate-800'
              : 'mb-3 block overflow-x-auto whitespace-pre rounded-xl bg-slate-100 px-4 py-3 text-xs font-mono text-slate-800'
          }
        >
          {children}
        </code>
      ) : (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700">
          {children}
        </code>
      )
    },
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className={compact ? 'mb-2 overflow-x-auto last:mb-0' : 'mb-3 overflow-x-auto'}>
        {children}
      </pre>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote
        className={
          compact
            ? 'mb-2 border-l-4 border-blue-200 pl-3 text-sm italic text-slate-600 last:mb-0'
            : 'mb-3 border-l-4 border-blue-200 pl-4 italic text-slate-600'
        }
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className={compact ? 'my-3 border-slate-200' : 'my-4 border-slate-200'} />,
    a: ({ href, children }: { href?: string; children?: ReactNode }) => (
      <a
        href={href}
        className="break-all text-blue-600 underline hover:text-blue-700"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className={compact ? 'mb-2 overflow-x-auto last:mb-0' : 'mb-4 overflow-x-auto'}>
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => (
      <thead className="bg-slate-50">{children}</thead>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-600">
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="border border-slate-200 px-2 py-1.5 text-slate-700">{children}</td>
    ),
    tr: ({ children }: { children?: ReactNode }) => (
      <tr className="even:bg-slate-50/50">{children}</tr>
    ),
  }
}

export default function MarkdownRenderer({
  content,
  variant = 'default',
}: Props) {
  return (
    <div
      className={
        variant === 'compact'
          ? 'w-full min-w-0 text-sm [&>*:last-child]:mb-0'
          : undefined
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents(variant)}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

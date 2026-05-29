'use client'

import { useEffect, useRef } from 'react'
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

interface Props {
  content: string
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold text-slate-800 mt-5 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-slate-700 mt-4 mb-1.5">{children}</h3>,
        p: ({ children }) => <p className="text-sm text-slate-700 leading-relaxed mb-3">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-slate-700">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-slate-700">{children}</ol>,
        li: ({ children }) => <li className="text-sm text-slate-700">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
        code: ({ children, className }) => {
          const lang = className?.replace('language-', '') ?? ''
          if (lang === 'mermaid') {
            return <MermaidBlock code={String(children).trim()} />
          }
          const isBlock = Boolean(className)
          return isBlock
            ? <code className="block bg-slate-100 rounded-xl px-4 py-3 text-xs font-mono text-slate-800 overflow-x-auto mb-3 whitespace-pre">{children}</code>
            : <code className="bg-slate-100 rounded px-1.5 py-0.5 text-xs font-mono text-slate-700">{children}</code>
        },
        pre: ({ children }) => <pre className="mb-3 overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-slate-600 mb-3">{children}</blockquote>,
        hr: () => <hr className="border-slate-200 my-4" />,
        a: ({ href, children }) => (
          <a href={href} className="text-blue-600 underline hover:text-blue-700" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
        th: ({ children }) => <th className="text-left px-3 py-2 text-slate-600 font-semibold border border-slate-200">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 border border-slate-200 text-slate-700">{children}</td>,
        tr: ({ children }) => <tr className="even:bg-slate-50/50">{children}</tr>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { EditorView, placeholder } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import CodeMirror from '@uiw/react-codemirror'

const theme = EditorView.theme({
  '&': { backgroundColor: 'transparent', color: 'var(--text)', fontSize: '16px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-sans)', lineHeight: '1.7', overflow: 'visible' },
  '.cm-content': { padding: '0 0 40vh', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'var(--text)', borderLeftWidth: '1.5px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection) !important',
  },
  '.cm-placeholder': { color: 'var(--text-faint)' },
})

const highlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.6em', fontWeight: '700', lineHeight: '1.4' },
  { tag: t.heading2, fontSize: '1.3em', fontWeight: '600' },
  { tag: t.heading3, fontSize: '1.12em', fontWeight: '600' },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '600' },
  { tag: t.strong, fontWeight: '600' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--text-muted)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--text-faint)' },
  { tag: t.quote, color: 'var(--text-muted)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.88em', color: 'var(--code-text)' },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], color: 'var(--text-faint)' },
  { tag: t.list, color: 'var(--text)' },
  { tag: [t.keyword, t.operator], color: 'var(--hl-keyword)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--hl-string)' },
  { tag: [t.number, t.bool, t.atom], color: 'var(--hl-number)' },
  { tag: [t.comment], color: 'var(--text-faint)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.typeName, t.className], color: 'var(--hl-title)' },
])

const extensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  syntaxHighlighting(highlight),
  EditorView.lineWrapping,
  theme,
  placeholder('Start writing in Markdown…'),
]

export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      autoFocus
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        highlightSelectionMatches: false,
        autocompletion: false,
        searchKeymap: true,
      }}
      theme="none"
      className="md-editor"
    />
  )
}

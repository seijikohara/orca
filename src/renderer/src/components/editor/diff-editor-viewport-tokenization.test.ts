import { describe, expect, it, vi } from 'vitest'
import { keepDiffEditorViewportTokenized } from './diff-editor-viewport-tokenization'

type Listener = () => void

function paneEditorFixture() {
  const listeners = new Map<string, Listener>()
  const subscribe = (event: string) => (listener: Listener) => {
    listeners.set(event, listener)
    return { dispose: () => listeners.delete(event) }
  }
  return {
    editor: {
      handleInitialized: vi.fn(),
      onDidChangeModel: subscribe('model'),
      onDidChangeHiddenAreas: subscribe('hiddenAreas'),
      onDidLayoutChange: subscribe('layout')
    },
    fire: (event: string) => listeners.get(event)?.()
  }
}

function diffEditorFixture() {
  const original = paneEditorFixture()
  const modified = paneEditorFixture()
  const diffEditor = {
    handleInitialized: vi.fn(),
    getOriginalEditor: () => original.editor,
    getModifiedEditor: () => modified.editor
  }
  return { diffEditor, original, modified }
}

const VISIBLE_LINE_EVENTS = ['model', 'hiddenAreas', 'layout']

describe('keepDiffEditorViewportTokenized', () => {
  it('tokenizes the viewport on mount', () => {
    const { diffEditor } = diffEditorFixture()

    keepDiffEditorViewportTokenized(diffEditor)

    expect(diffEditor.handleInitialized).toHaveBeenCalledOnce()
  })

  it.each(VISIBLE_LINE_EVENTS)('tokenizes each pane again when its %s changes', (event) => {
    const { diffEditor, original, modified } = diffEditorFixture()

    keepDiffEditorViewportTokenized(diffEditor)
    original.fire(event)
    modified.fire(event)

    expect(original.editor.handleInitialized).toHaveBeenCalledOnce()
    expect(modified.editor.handleInitialized).toHaveBeenCalledOnce()
  })

  it('stops reacting after dispose', () => {
    const { diffEditor, original, modified } = diffEditorFixture()

    keepDiffEditorViewportTokenized(diffEditor).dispose()
    for (const event of VISIBLE_LINE_EVENTS) {
      original.fire(event)
      modified.fire(event)
    }

    expect(original.editor.handleInitialized).not.toHaveBeenCalled()
    expect(modified.editor.handleInitialized).not.toHaveBeenCalled()
  })
})

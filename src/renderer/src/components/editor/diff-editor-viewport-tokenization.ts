import type { IDisposable } from 'monaco-editor'

type VisibleLinesChangeEvent = (listener: () => void) => IDisposable

type PaneEditor = {
  handleInitialized?: () => void
  onDidChangeModel: VisibleLinesChangeEvent
  onDidChangeHiddenAreas: VisibleLinesChangeEvent
  onDidLayoutChange: VisibleLinesChangeEvent
}

type DiffEditorWithPanes = {
  handleInitialized: () => void
  getOriginalEditor: () => PaneEditor
  getModifiedEditor: () => PaneEditor
}

/** Standalone Monaco never calls `handleInitialized`, so unscrolled panes wait for idle-time background tokenization. */
export function keepDiffEditorViewportTokenized(diffEditor: DiffEditorWithPanes): IDisposable {
  diffEditor.handleInitialized()
  const subscriptions = [diffEditor.getOriginalEditor(), diffEditor.getModifiedEditor()].flatMap(
    (paneEditor) => {
      const tokenizeVisibleLines = (): void => paneEditor.handleInitialized?.()
      // Monaco refreshes viewport tokens only on scroll, edit and view-state restore; these events change visible lines without them.
      return [
        paneEditor.onDidChangeModel(tokenizeVisibleLines),
        paneEditor.onDidChangeHiddenAreas(tokenizeVisibleLines),
        paneEditor.onDidLayoutChange(tokenizeVisibleLines)
      ]
    }
  )
  return {
    dispose: () => {
      for (const subscription of subscriptions) {
        subscription.dispose()
      }
    }
  }
}

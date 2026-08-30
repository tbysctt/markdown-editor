import { createContext, useContext, type ReactNode } from 'react';
import type { QueuedImage } from '../utils/markdown';

export interface ImageRepairContextValue {
  docPath: string;
  addQueuedImage: (image: QueuedImage) => void;
  markDirty: () => void;
}

export interface EditorTabContextValue {
  docPath: string;
  resolveImageSrc: (src: string) => Promise<string>;
  repairContext: ImageRepairContextValue;
}

const EditorTabContext = createContext<EditorTabContextValue | null>(null);

export function EditorTabProvider({
  value,
  children,
}: {
  value: EditorTabContextValue;
  children: ReactNode;
}) {
  return (
    <EditorTabContext.Provider value={value}>{children}</EditorTabContext.Provider>
  );
}

export function useEditorTabContext(): EditorTabContextValue {
  const context = useContext(EditorTabContext);
  if (!context) {
    throw new Error('useEditorTabContext must be used within EditorTabProvider');
  }
  return context;
}

export function useOptionalEditorTabContext(): EditorTabContextValue | null {
  return useContext(EditorTabContext);
}

import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';
import {
  getImageDocPathProvider,
  getImageRepairContext,
  resolveImageDisplayUrl,
} from '../extensions/imageExtension';
import { isUntitledPath } from '../types/workspace';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { ImagePathDialog } from './ImagePathDialog';
import { isRemoteImageSrc } from '../utils/assetUrl';

type ImageStatus = 'loading' | 'loaded' | 'broken';

export function ImageView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const src = (node.attrs.src as string) || '';
  const alt = (node.attrs.alt as string) || '';

  const [displayUrl, setDisplayUrl] = useState('');
  const [status, setStatus] = useState<ImageStatus>('loading');
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [showPathDialog, setShowPathDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!src) {
        setDisplayUrl('');
        setStatus('broken');
        return;
      }

      if (isRemoteImageSrc(src)) {
        setDisplayUrl(src);
        setStatus('loading');
        return;
      }

      setStatus('loading');
      try {
        const url = await resolveImageDisplayUrl(src);
        if (!cancelled) {
          setDisplayUrl(url);
        }
      } catch {
        if (!cancelled) {
          setDisplayUrl('');
          setStatus('broken');
        }
      }
    };

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const handleChooseImage = useCallback(async () => {
    const docPath = getImageDocPathProvider();
    const repairContext = getImageRepairContext();
    const sourcePath = await window.electronAPI.openImage();
    if (!sourcePath) {
      return;
    }

    if (isUntitledPath(docPath)) {
      const staged = await window.electronAPI.stageImage(sourcePath);
      updateAttributes({ src: staged.relativePath });
      repairContext?.addQueuedImage(staged);
      return;
    }

    const { relativePath } = await window.electronAPI.copyImageForDocument(
      sourcePath,
      docPath,
    );
    updateAttributes({ src: relativePath });
    repairContext?.markDirty();
  }, [updateAttributes]);

  const openRepairMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const menuItems: ContextMenuItem[] = [
    {
      id: 'edit-path',
      label: 'Edit path',
      onClick: () => {
        setMenuPosition(null);
        setShowPathDialog(true);
      },
    },
    {
      id: 'choose-image',
      label: 'Choose image',
      onClick: () => {
        setMenuPosition(null);
        void handleChooseImage();
      },
    },
    {
      id: 'delete-image',
      label: 'Delete image',
      danger: true,
      onClick: () => {
        setMenuPosition(null);
        deleteNode();
      },
    },
  ];

  if (status === 'broken' || (!displayUrl && status !== 'loading')) {
    return (
      <NodeViewWrapper className="my-2" data-src={src}>
        <button
          type="button"
          className="flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-md border border-dashed border-gray-300 bg-red-50 px-4 py-3 text-left text-red-900 hover:border-red-300 hover:bg-red-100"
          onClick={openRepairMenu}
          contentEditable={false}
        >
          <span className="text-sm font-semibold">Image not found</span>
          <span className="break-all font-mono text-xs text-red-800">
            {src || 'No image path set'}
          </span>
          <span className="text-xs text-red-700">Click for options</span>
        </button>

        {menuPosition && (
          <ContextMenu
            x={menuPosition.x}
            y={menuPosition.y}
            items={menuItems}
            onClose={() => setMenuPosition(null)}
          />
        )}

        {showPathDialog && (
          <ImagePathDialog
            initialPath={src}
            onConfirm={(path) => {
              updateAttributes({ src: path });
              getImageRepairContext()?.markDirty();
              setShowPathDialog(false);
            }}
            onCancel={() => setShowPathDialog(false)}
          />
        )}
      </NodeViewWrapper>
    );
  }

  if (status === 'loading' && !displayUrl) {
    return (
      <NodeViewWrapper className="my-2" data-src={src}>
        <div
          className="flex min-h-[4rem] items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500"
          contentEditable={false}
          aria-busy="true"
        >
          Loading image…
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-2" data-src={src}>
      <img
        className="block h-auto max-w-full rounded"
        src={displayUrl}
        alt={alt}
        draggable={false}
        contentEditable={false}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('broken')}
      />
    </NodeViewWrapper>
  );
}

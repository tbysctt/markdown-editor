import { Image } from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageView } from '../components/ImageView';
import type { QueuedImage } from '../utils/markdown';

type ImageDocPathProvider = () => string;
type ImageSrcResolver = (src: string) => Promise<string>;

export interface ImageRepairContext {
  docPath: string;
  addQueuedImage: (image: QueuedImage) => void;
  markDirty: () => void;
}

let imageDocPathProvider: ImageDocPathProvider = () => '';
let imageSrcResolver: ImageSrcResolver | null = null;
let imageRepairContext: ImageRepairContext | null = null;

export function setImageDocPathProvider(provider: ImageDocPathProvider): void {
  imageDocPathProvider = provider;
}

export function getImageDocPathProvider(): string {
  return imageDocPathProvider();
}

export function setImageSrcResolver(resolver: ImageSrcResolver | null): void {
  imageSrcResolver = resolver;
}

export function setImageRepairContext(context: ImageRepairContext | null): void {
  imageRepairContext = context;
}

export function getImageRepairContext(): ImageRepairContext | null {
  return imageRepairContext;
}

export async function resolveImageDisplayUrl(src: string): Promise<string> {
  if (!src) {
    return '';
  }

  if (imageSrcResolver) {
    return imageSrcResolver(src);
  }

  return src;
}

export const ImageExtension = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
}).configure({
  inline: false,
  allowBase64: false,
});

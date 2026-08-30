export const IPC = {
  FILE_OPEN: 'file:open',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS: 'file:save-as',
  FILE_OPEN_IMAGE: 'file:open-image',
  FILE_COPY_IMAGE: 'file:copy-image',
  FILE_STAGE_IMAGE: 'file:stage-image',
  FILE_COPY_QUEUED_IMAGES: 'file:copy-queued-images',
  FILE_RESOLVE_ASSET_URL: 'file:resolve-asset-url',
  FILE_SAVE_CLIPBOARD_IMAGE: 'file:save-clipboard-image',
  FILE_SAVE_IMAGE_BYTES: 'file:save-image-bytes',
  FILE_RESOLVE_ABSOLUTE_ASSET_URL: 'file:resolve-absolute-asset-url',
  EXPORT_PDF: 'export:pdf',
  PRINT_DOCUMENT: 'print:document',
  DOC_DIRTY_CHANGED: 'doc:dirty-changed',
  DOC_SESSION_CHANGED: 'doc:session-changed',
  DOC_CONFIRM_DISCARD: 'doc:confirm-discard',
  DOC_READY_TO_CLOSE: 'doc:ready-to-close',
  DOC_ABORT_CLOSE: 'doc:abort-close',
  WINDOW_INITIAL_DOCUMENT: 'window:initial-document',
  WINDOW_INITIAL_UNTITLED: 'window:initial-untitled',
  WINDOW_OPEN_DOCUMENT: 'window:open-document',
  WINDOW_INITIAL_FOLDER: 'window:initial-folder',
  WINDOW_OPEN_FOLDER: 'window:open-folder',
  WINDOW_REQUEST_CLOSE: 'window:request-close',
  FOLDER_OPEN: 'folder:open',
  FOLDER_READ_TREE: 'folder:read-tree',
  FOLDER_READ_FILE: 'folder:read-file',
  FOLDER_WATCH_START: 'folder:watch-start',
  FOLDER_WATCH_STOP: 'folder:watch-stop',
  FOLDER_CHANGED: 'folder:changed',
  FOLDER_RENAMED: 'folder:renamed',
  FOLDER_CREATE_FILE: 'folder:create-file',
  FOLDER_CREATE_FOLDER: 'folder:create-folder',
  FOLDER_DELETE: 'folder:delete',
  FOLDER_CONFIRM_DELETE: 'folder:confirm-delete',
  FOLDER_RENAME: 'folder:rename',
  FILE_RENAME: 'file:rename',
  MENU_ACTION: 'menu:action',
  APP_BEFORE_CLOSE: 'app:before-close',
  APP_CLOSE_RESPONSE: 'app:close-response',
} as const;

export type MenuAction =
  | 'open'
  | 'close'
  | 'save'
  | 'save-as'
  | 'save-and-close'
  | 'export-pdf'
  | 'print'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset'
  | 'format-bold'
  | 'format-italic'
  | 'format-strikethrough'
  | 'format-heading-1'
  | 'format-heading-2'
  | 'format-heading-3'
  | 'format-heading-4'
  | 'format-heading-5'
  | 'format-heading-6'
  | 'format-body'
  | 'format-bullet-list'
  | 'format-ordered-list'
  | 'format-task-list'
  | 'format-blockquote'
  | 'format-link'
  | 'format-table'
  | 'format-image'
  | 'format-code-snippet'
  | 'format-math'
  | 'find'
  | 'find-in-workspace'
  | 'command-palette';

export type DiscardChoice = 'save' | 'discard' | 'cancel';

export type WindowMode = 'empty' | 'single' | 'folder';

export type DeleteConfirmChoice = 'confirm' | 'cancel';

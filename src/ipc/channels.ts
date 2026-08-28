export const IPC = {
  FILE_OPEN: 'file:open',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS: 'file:save-as',
  FILE_OPEN_IMAGE: 'file:open-image',
  FILE_COPY_IMAGE: 'file:copy-image',
  FILE_STAGE_IMAGE: 'file:stage-image',
  FILE_COPY_QUEUED_IMAGES: 'file:copy-queued-images',
  FILE_RESOLVE_ASSET_URL: 'file:resolve-asset-url',
  DOC_DIRTY_CHANGED: 'doc:dirty-changed',
  DOC_READY_TO_CLOSE: 'doc:ready-to-close',
  DOC_ABORT_CLOSE: 'doc:abort-close',
  MENU_ACTION: 'menu:action',
  APP_BEFORE_CLOSE: 'app:before-close',
  APP_CLOSE_RESPONSE: 'app:close-response',
} as const;

export type MenuAction = 'new' | 'open' | 'save' | 'save-as' | 'save-and-close';

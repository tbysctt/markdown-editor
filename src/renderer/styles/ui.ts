/** z-index ladder: findBar(20) < dropdown(50) < dialog(100) < palette(110) < contextMenu(1000) */
export const Z_FIND_BAR = 'z-20';
export const Z_DROPDOWN = 'z-50';
export const Z_DIALOG = 'z-[100]';
export const Z_PALETTE = 'z-[110]';
export const Z_CONTEXT_MENU = 'z-[1000]';

export const dialogOverlayClass = `fixed inset-0 ${Z_DIALOG} flex items-center justify-center bg-black/40`;

export const dialogPanelClass =
  'w-full max-w-[400px] rounded-xl bg-white p-6 shadow-2xl';

export const dialogTitleClass = 'mb-4 mt-0 text-lg';

export const dialogLabelClass = 'mb-1 block text-sm text-gray-600';

export const dialogInputClass =
  'mb-4 w-full rounded-md border border-gray-300 px-3 py-2 font-inherit focus:border-blue-600 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600';

export const dialogTextareaClass =
  'mb-4 min-h-24 w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-inherit focus:border-blue-600 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600';

export const dialogActionsClass = 'flex justify-end gap-2';

export const dialogCancelBtnClass =
  'cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2';

export const dialogPrimaryBtnClass =
  'cursor-pointer rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-white hover:bg-blue-700';

export const searchInputClass =
  'rounded border border-gray-300 bg-white px-2 py-1.5 text-[0.8125rem] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15';

export const searchToggleBtnClass =
  'inline-flex h-[1.875rem] min-w-[1.625rem] cursor-pointer items-center justify-center rounded border border-gray-300 bg-white px-1.5 text-xs text-gray-600';

export const commandPaletteOverlayClass = `fixed inset-0 ${Z_PALETTE} flex items-start justify-center bg-black/40 pt-[10vh]`;

export const commandPalettePanelClass =
  'w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-2xl';

export const sectionHeadingClass =
  'mb-2 mt-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500';

export const emptyStateClass =
  'flex flex-1 items-center justify-center text-[0.9375rem] text-gray-500';

export const toolbarIconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded border-none bg-transparent text-app-muted hover:bg-app-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

export const toolbarIconBtnActiveClass = 'bg-blue-100 text-blue-700';

export const splitBtnMainClass =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-l border-none bg-transparent p-0 text-app-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

export const splitBtnToggleClass =
  'inline-flex h-8 w-5 cursor-pointer items-center justify-center rounded-r border-l border-app-border bg-transparent p-0 text-app-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 [&_svg]:h-4 [&_svg]:w-4';

export const splitBtnWrapperClass =
  'flex items-stretch rounded hover:bg-app-surface-hover';

export const dropdownMenuPanelClass = `absolute left-0 top-[calc(100%+4px)] ${Z_DROPDOWN} min-w-[11.25rem] rounded-md border border-app-border bg-white p-1 shadow-lg`;

export const dropdownMenuItemClass =
  'flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2.5 py-1.5 text-left text-[0.8125rem] text-app-muted hover:bg-app-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600';

export const dropdownMenuItemActiveClass = 'bg-blue-100 text-blue-700';

export const dropdownTriggerClass =
  'inline-flex h-8 min-w-[7.5rem] cursor-pointer items-center gap-1.5 rounded border-none bg-transparent px-2 pl-2.5 text-[0.8125rem] font-medium text-app-muted hover:bg-app-surface-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600';

export const toolbarDividerClass =
  'mx-1.5 h-6 w-px shrink-0 bg-app-border';

export const sidebarViewBtnClass =
  'inline-flex h-6 min-w-6 items-center justify-center rounded border-none bg-transparent px-1 text-gray-500 hover:bg-gray-100 hover:text-app-text [&_svg]:h-3.5 [&_svg]:w-3.5';

export const sidebarViewBtnActiveClass = 'bg-gray-200 text-app-text';

export const sidebarActionBtnClass =
  'inline-flex h-6 min-w-6 items-center justify-center rounded border-none bg-transparent px-1 text-xs leading-none text-gray-600 hover:bg-gray-100 hover:text-app-text [&_svg]:h-3.5 [&_svg]:w-3.5';

export const findBtnClass =
  'inline-flex min-w-[1.625rem] h-[1.625rem] cursor-pointer items-center justify-center rounded border-none bg-transparent px-1 text-[0.8125rem] leading-none text-gray-600 hover:bg-gray-100 hover:text-app-text';

export const toggleBtnActiveClass = 'bg-gray-200 text-app-text';

export const listRowClass =
  'flex w-full cursor-pointer items-center gap-3 border-none bg-transparent text-left font-inherit text-app-text hover:bg-blue-50';

export const listRowActiveClass = 'bg-blue-100';

export const welcomeRowClass =
  'group -mx-2.5 flex w-full cursor-pointer items-center gap-3 rounded border-none bg-transparent px-2.5 py-2 text-left font-inherit text-app-text transition-colors hover:bg-gray-200';

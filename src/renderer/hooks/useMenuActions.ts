import { useEffect } from 'react';
import type { MenuAction } from '../../ipc/channels';

export function useMenuActions(
  actions: MenuAction[],
  handler: (action: MenuAction) => void,
): void {
  useEffect(() => {
    const actionSet = new Set(actions);
    const unsubscribe = window.electronAPI.onMenuAction((action) => {
      if (actionSet.has(action)) {
        handler(action);
      }
    });

    return unsubscribe;
  }, [actions, handler]);
}

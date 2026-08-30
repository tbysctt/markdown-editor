import { useSyncExternalStore, type ReactNode } from 'react';
import { APP_NAME } from '../../shared/appMeta';
import {
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
} from './icons/ExplorerIcons';
import {
  getRecentDisplayPath,
  getRecentEntryName,
  getRecentSnapshot,
  subscribeToRecents,
  type RecentEntry,
} from '../utils/recentPaths';

interface WelcomeScreenProps {
  onCreateNew: () => void;
  onOpenExisting: () => void;
  onOpenFolder: () => void;
  onOpenRecentFile: (path: string) => void;
  onOpenRecentFolder: (path: string) => void;
}

const isMac = navigator.platform.includes('Mac');

function formatShortcut(keys: string): string {
  if (isMac) {
    return keys
      .replace(/CmdOrCtrl/g, '⌘')
      .replace(/Shift/g, '⇧')
      .replace(/Alt/g, '⌥')
      .replace(/\+/g, '');
  }
  return keys.replace(/CmdOrCtrl/g, 'Ctrl').replace(/\+/g, '+');
}

interface WelcomeActionRowProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function WelcomeActionRow({
  icon,
  label,
  shortcut,
  onClick,
}: WelcomeActionRowProps) {
  return (
    <button type="button" className="welcome-action-row" onClick={onClick}>
      <span className="welcome-action-row-icon">{icon}</span>
      <span className="welcome-action-row-label">{label}</span>
      {shortcut && (
        <span className="welcome-action-row-shortcut">{shortcut}</span>
      )}
    </button>
  );
}

interface WelcomeRecentRowProps {
  entry: RecentEntry;
  onOpen: () => void;
}

function WelcomeRecentRow({ entry, onOpen }: WelcomeRecentRowProps) {
  const name = getRecentEntryName(entry.path);
  const displayPath = getRecentDisplayPath(entry.path);

  return (
    <button type="button" className="welcome-recent-row" onClick={onOpen}>
      <span className="welcome-recent-row-icon">
        {entry.type === 'folder' ? <FolderIcon /> : <FileIcon />}
      </span>
      <span className="welcome-recent-row-name">{name}</span>
      <span className="welcome-recent-row-path" title={entry.path}>
        {displayPath}
      </span>
    </button>
  );
}

export function WelcomeScreen({
  onCreateNew,
  onOpenExisting,
  onOpenFolder,
  onOpenRecentFile,
  onOpenRecentFolder,
}: WelcomeScreenProps) {
  const recents = useSyncExternalStore(
    subscribeToRecents,
    getRecentSnapshot,
    getRecentSnapshot,
  );

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">{APP_NAME}</h1>
        <p className="welcome-version">Version {__APP_VERSION__}</p>

        <section className="welcome-section">
          <h2 className="welcome-section-title">Start</h2>
          <div className="welcome-section-list">
            <WelcomeActionRow
              icon={<FilePlusIcon />}
              label="New document"
              shortcut={formatShortcut('CmdOrCtrl+N')}
              onClick={onCreateNew}
            />
            <WelcomeActionRow
              icon={<FileIcon />}
              label="Open file…"
              shortcut={formatShortcut('CmdOrCtrl+O')}
              onClick={onOpenExisting}
            />
            <WelcomeActionRow
              icon={<FolderPlusIcon />}
              label="Open folder…"
              shortcut={formatShortcut('CmdOrCtrl+Shift+O')}
              onClick={onOpenFolder}
            />
          </div>
        </section>

        <section className="welcome-section">
          <h2 className="welcome-section-title">Recent</h2>
          <div className="welcome-section-list">
            {recents.length === 0 ? (
              <p className="welcome-empty">No recent folders or files</p>
            ) : (
              recents.map((entry) => (
                <WelcomeRecentRow
                  key={entry.path}
                  entry={entry}
                  onOpen={() => {
                    if (entry.type === 'folder') {
                      onOpenRecentFolder(entry.path);
                    } else {
                      onOpenRecentFile(entry.path);
                    }
                  }}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

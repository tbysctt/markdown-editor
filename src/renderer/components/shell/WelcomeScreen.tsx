import { useSyncExternalStore, type ReactNode } from 'react';
import { APP_NAME } from '../../../shared/appMeta';
import {
  sectionHeadingClass,
  welcomeRowClass,
} from '../../styles/ui';
import {
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
} from '../icons/ExplorerIcons';
import {
  getRecentDisplayPath,
  getRecentEntryName,
  getRecentSnapshot,
  subscribeToRecents,
  type RecentEntry,
} from '../../utils/recentPaths';

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
    <button type="button" className={welcomeRowClass} onClick={onClick}>
      <span className="flex w-5 shrink-0 items-center justify-center text-gray-600 [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span className="flex-1 text-[0.9375rem] text-blue-600 group-hover:text-blue-700">
        {label}
      </span>
      {shortcut && (
        <span className="shrink-0 text-[0.8125rem] text-gray-400">{shortcut}</span>
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
    <button type="button" className={welcomeRowClass} onClick={onOpen}>
      <span className="flex w-5 shrink-0 items-center justify-center text-gray-600 [&_svg]:h-4 [&_svg]:w-4">
        {entry.type === 'folder' ? <FolderIcon /> : <FileIcon />}
      </span>
      <span className="max-w-[40%] shrink-0 truncate text-[0.9375rem] text-blue-600 group-hover:text-blue-700">
        {name}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-right text-[0.8125rem] text-gray-400"
        title={entry.path}
      >
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
    <div className="flex min-h-full justify-center overflow-y-auto bg-app-bg px-16 py-12">
      <div className="w-full max-w-[640px]">
        <h1 className="mb-2 mt-0 text-4xl font-light tracking-tight text-app-text">
          {APP_NAME}
        </h1>
        <p className="mb-10 mt-0 text-[0.8125rem] text-gray-400">
          Version {__APP_VERSION__}
        </p>

        <section className="mb-8">
          <h2 className={sectionHeadingClass}>
            Start
          </h2>
          <div className="flex flex-col">
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

        <section className="mb-8">
          <h2 className={sectionHeadingClass}>
            Recent
          </h2>
          <div className="flex flex-col">
            {recents.length === 0 ? (
              <p className="m-0 px-2.5 py-2 text-sm italic text-gray-400">
                No recent folders or files
              </p>
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

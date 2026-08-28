interface WelcomeScreenProps {
  onCreateNew: () => void;
  onOpenExisting: () => void;
  onOpenFolder: () => void;
}

export function WelcomeScreen({
  onCreateNew,
  onOpenExisting,
  onOpenFolder,
}: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1>MDEditor</h1>
        <p>Create a new document, open an existing markdown file, or open a folder.</p>
        <div className="welcome-actions">
          <button type="button" className="welcome-button primary" onClick={onCreateNew}>
            Create new document
          </button>
          <button
            type="button"
            className="welcome-button secondary"
            onClick={onOpenExisting}
          >
            Open existing document
          </button>
          <button
            type="button"
            className="welcome-button secondary"
            onClick={onOpenFolder}
          >
            Open folder
          </button>
        </div>
      </div>
    </div>
  );
}

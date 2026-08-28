interface WelcomeScreenProps {
  onCreateNew: () => void;
  onOpenExisting: () => void;
}

export function WelcomeScreen({
  onCreateNew,
  onOpenExisting,
}: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1>MDEditor</h1>
        <p>Create a new document or open an existing markdown file.</p>
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
        </div>
      </div>
    </div>
  );
}

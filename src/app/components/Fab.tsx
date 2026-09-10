

type Props = {
  visible?: boolean;          // ← render only when true (prevents focus issues)
  showInstall: boolean;
  onNew: () => void;
  onPrint: () => void;
  onInstall: () => void;
  onGear?: () => void;
  showGear?: boolean;
};

export default function Fab({
  visible = true,
  showInstall,
  onNew,
  onPrint,
  onInstall,
  onGear,
  showGear,
}: Props) {
  if (!visible) return null;   // ← no subtree when hidden

  return (
    <div className="fab-row">
      {showGear && (
        <button
          type="button"
          className="btn btn-primary fab"
          onClick={onGear}
          aria-label="Show controls"
          title="Show controls"
        >
          ⚙️
        </button>
      )}
      <button
        type="button"
        className="btn fab"
        onClick={onNew}
        aria-label="Generate new maze"
        title="New"
      >
        ↻
      </button>
      <button
        type="button"
        className="btn fab"
        onClick={onPrint}
        aria-label="Print maze"
        title="Print"
      >
        🖨️
      </button>
      {showInstall && (
        <button
          type="button"
          className="btn btn-primary fab"
          onClick={onInstall}
          aria-label="Install app"
          title="Install"
        >
          ⬇️
        </button>
      )}
    </div>
  );
}

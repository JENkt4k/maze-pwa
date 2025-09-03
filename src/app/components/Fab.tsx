import React from "react";

type Props = {
  showInstall: boolean;
  onNew: () => void;
  onPrint: () => void;
  onInstall: () => void;
  onGear?: () => void;
  showGear?: boolean;
};

export default function Fab({ showInstall, onNew, onPrint, onInstall, onGear, showGear }: Props) {
  return (
    <div className="fab-row" >
      {showGear && <button className="btn btn-primary fab" title="Show controls" onClick={onGear}>⚙️</button>}
      <button className="btn fab" title="New" onClick={onNew}>↻</button>
      <button className="btn fab" title="Print" onClick={onPrint}>🖨️</button>
      {showInstall && <button className="btn btn-primary fab" title="Install" onClick={onInstall}>⬇️</button>}
    </div>
  );
}

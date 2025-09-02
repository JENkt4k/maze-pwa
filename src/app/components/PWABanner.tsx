import React from "react";

type Props = {
  offlineReady: boolean;
  needRefresh: boolean;
  onUpdate: () => void;
  onClose: () => void;
};

export default function PWABanner({ offlineReady, needRefresh, onUpdate, onClose }: Props) {
  if (!offlineReady && !needRefresh) return null;
  return (
    <div className="pwa-banner">
      <span>{offlineReady ? "App is ready to work offline." : "A new version is available."}</span>
      <div className="hstack">
        {needRefresh && (
          <button className="btn btn-primary" onClick={onUpdate}>Update</button>
        )}
        <button className="btn" style={{ borderColor: "#374151" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}



type Props = {
  offlineReady: boolean;
  needRefresh: boolean;
  online:boolean;
  error:string|null;
  onUpdate: () => void;
  onClose: () => void;
};

export default function PWABanner({ offlineReady, needRefresh,online,error, onUpdate, onClose }: Props) {
  if (online&&!offlineReady && !needRefresh&&!error) return null;
  const message=needRefresh?'A new version is available. Updating clears the drawn path.':!online?'You are offline. Saved mazes and cached tools remain available.':error??'App is ready to work offline.';
  return (
    <div className="pwa-banner" role="status" data-network={online?'online':'offline'}>
      <span>{message}</span>
      <div className="hstack">
        {needRefresh && (
          <button className="btn btn-primary" onClick={onUpdate}>Update</button>
        )}
        {online&&<button className="btn" style={{ borderColor: "#374151" }} onClick={onClose}>Close</button>}
      </div>
    </div>
  );
}

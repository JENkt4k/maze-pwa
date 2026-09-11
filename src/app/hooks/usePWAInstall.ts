import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as InstallEvent); setCanInstall(true); };
    const onInstalled = () => { setDeferred(null); setCanInstall(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    if (!deferred) return;
    setCanInstall(false);
    try { await deferred.prompt(); await deferred.userChoice; }
    catch { /* A dismissed or unavailable browser install prompt is non-fatal. */ }
    finally { setDeferred(null); }
  }
  return { canInstall, install };
}

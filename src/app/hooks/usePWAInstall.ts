import { useEffect, useState } from "react";

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onBip = (e: any) => { e.preventDefault(); setDeferred(e); setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  async function install() {
    if (!deferred) return;
    setCanInstall(false);
    await deferred.prompt();
    setDeferred(null);
  }

  return { canInstall, install };
}

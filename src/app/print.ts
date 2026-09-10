let printing = false;

export function handlePrint(svg: string): void {
  if (printing || !svg) return;
  printing = true;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || standalone) {
    const done = () => { printing = false; window.removeEventListener('afterprint', done); window.clearTimeout(timeout); };
    const timeout = window.setTimeout(done, 60000);
    window.addEventListener('afterprint', done, { once: true });
    try { window.print(); } catch { done(); }
    return;
  }
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', width: '0', height: '0', border: '0' });
  iframe.title = 'Maze print preview';
  let printed = false;
  let printWindow: Window | null = null;
  const done = () => { printWindow?.removeEventListener('afterprint', done); window.clearTimeout(timeout); iframe.remove(); printing = false; };
  const timeout = window.setTimeout(done, 60000);
  iframe.onload = () => {
    if (printed) return;
    printWindow = iframe.contentWindow;
    if (!printWindow) { done(); return; }
    printed = true;
    printWindow.addEventListener('afterprint', done, { once: true });
    try { printWindow.focus(); printWindow.print(); } catch { done(); }
  };
  iframe.srcdoc = `<!doctype html><html><head><title>Maze Print</title><style>body{margin:0}svg{width:100%;height:auto;max-height:95vh}@page{margin:10mm}</style></head><body>${svg}</body></html>`;
  document.body.appendChild(iframe);
}

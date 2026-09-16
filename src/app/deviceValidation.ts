import type { CandidateRoute } from './competitionRoom';

export type DeviceTestScenario='same-wifi'|'cross-network'|'offline-relaunch'|'install-update'|'unspecified';
export type ManualTestResult='not-tested'|'passed'|'failed';

export type DeviceValidationReport=Readonly<{
  version:1;
  recordedAt:string;
  scenario:DeviceTestScenario;
  qrScan:ManualTestResult;
  notes:string;
  environment:Readonly<{
    userAgent:string;
    platform:string;
    language:string;
    viewport:string;
    devicePixelRatio:number;
    online:boolean;
    secureContext:boolean;
    standalone:boolean;
  }>;
  capabilities:Readonly<{
    barcodeDetector:boolean;
    camera:boolean;
    nativeShare:boolean;
    clipboard:boolean;
    serviceWorker:boolean;
  }>;
  connection:Readonly<{route:CandidateRoute;peerState:RTCPeerConnectionState;dataChannelOpen:boolean}>;
}>;

export function createDeviceValidationReport(scenario:DeviceTestScenario,qrScan:ManualTestResult,notes:string,route:CandidateRoute,peerState:RTCPeerConnectionState,dataChannelOpen:boolean):DeviceValidationReport{
  const nav=navigator as Navigator&{standalone?:boolean};
  return{
    version:1,recordedAt:new Date().toISOString(),scenario,qrScan,notes:notes.trim().slice(0,500),
    environment:{
      userAgent:nav.userAgent,platform:nav.platform||'unknown',language:nav.language,
      viewport:`${window.innerWidth}x${window.innerHeight}`,devicePixelRatio:window.devicePixelRatio||1,
      online:nav.onLine,secureContext:window.isSecureContext,
      standalone:window.matchMedia('(display-mode: standalone)').matches||nav.standalone===true,
    },
    capabilities:{
      barcodeDetector:'BarcodeDetector' in window,
      camera:!!nav.mediaDevices?.getUserMedia,
      nativeShare:typeof nav.share==='function',
      clipboard:!!nav.clipboard,
      serviceWorker:'serviceWorker' in nav,
    },
    connection:{route,peerState,dataChannelOpen},
  };
}

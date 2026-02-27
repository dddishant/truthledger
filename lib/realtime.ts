export type ScanProgressEvent = {
  step: 'discover' | 'extract' | 'classify' | 'store' | 'done' | 'error';
  message: string;
  progress: number;
  entityId: string;
  ts: string;
};

type ScanProgressHandlers = {
  onEvent?: (event: ScanProgressEvent) => void;
  onDone?: (event: ScanProgressEvent) => void;
  onError?: (message: string) => void;
};

export function startScanProgressStream(entityId: string, handlers: ScanProgressHandlers) {
  const source = new EventSource(`/api/scan/stream?entityId=${encodeURIComponent(entityId)}`);

  source.addEventListener('progress', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as ScanProgressEvent;
    handlers.onEvent?.(payload);
  });

  source.addEventListener('done', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as ScanProgressEvent;
    handlers.onDone?.(payload);
    source.close();
  });

  source.onerror = () => {
    handlers.onError?.('Lost realtime scan connection.');
    source.close();
  };

  return () => source.close();
}

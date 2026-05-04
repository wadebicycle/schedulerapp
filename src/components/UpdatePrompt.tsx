import * as React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function UpdatePrompt() {
  let needRefresh = false;
  let updateServiceWorker = (_reload?: boolean) => {};
  let offlineReady = false;

  try {
    const result = useRegisterSW({
      onRegistered(r) {
        if (r) {
          setInterval(() => r.update(), 60 * 1000);
        }
      },
    });
    needRefresh = result.needRefresh[0];
    updateServiceWorker = result.updateServiceWorker;
    offlineReady = result.offlineReady[0];
  } catch {
    return (
      <div className="fixed bottom-4 right-4 z-[100] pointer-events-auto px-3 py-2 rounded-xl shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm">
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors text-xs"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] pointer-events-auto px-4 py-3 rounded-xl shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm max-w-sm w-[calc(100%-2rem)] sm:w-auto">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
        <div className="flex-1 text-zinc-700 dark:text-zinc-300">
          {needRefresh ? 'Có phiên bản mới!' : offlineReady ? 'Ứng dụng đã sẵn sàng offline' : 'Cần tải lại trang'}
        </div>
        <button
          onClick={() => {
            if (needRefresh) {
              updateServiceWorker(true);
            } else {
              window.location.reload();
            }
          }}
          className="pointer-events-auto px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors text-xs"
        >
          {needRefresh ? 'Cập nhật' : 'Tải lại'}
        </button>
      </div>
    </div>
  );
}

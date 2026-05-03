import * as React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function UpdatePrompt() {
  let needRefresh = false;
  let updateServiceWorker = (_reload?: boolean) => {};

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
  } catch {
    return null;
  }

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm max-w-sm w-[calc(100%-2rem)]">
      <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
      <span className="flex-1 text-zinc-700 dark:text-zinc-300">
        Có phiên bản mới!
      </span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors text-xs"
      >
        Cập nhật
      </button>
    </div>
  );
}

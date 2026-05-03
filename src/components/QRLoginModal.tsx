import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  generateSessionId,
  createQRSession,
  createLocalQRSession,
  watchQRSession,
  deleteQRSession,
  QRUser,
} from "../lib/qrAuth";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  theme: "light" | "dark";
  onClose: () => void;
  onLoginSuccess: (user: QRUser) => void;
}

type Phase = "generating" | "waiting" | "approved" | "expired" | "error";

export function QRLoginModal({ open, theme, onClose, onLoginSuccess }: Props) {
  const [phase, setPhase] = React.useState<Phase>("generating");
  const [sessionId, setSessionId] = React.useState<string>("");
  const [qrUrl, setQrUrl] = React.useState<string>("");
  const [secondsLeft, setSecondsLeft] = React.useState(300);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = React.useCallback(async () => {
    cleanupRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);

    setPhase("generating");
    setSecondsLeft(300);
    const id = generateSessionId();
    setSessionId(id);

    const url = `${window.location.origin}${window.location.pathname}?qrSession=${id}`;
    setQrUrl(url);

    try {
      createLocalQRSession(id);
      await createQRSession(id);
      setPhase("waiting");

      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      cleanupRef.current = watchQRSession(
        id,
        (user) => {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("approved");
          deleteQRSession(id).catch(() => {});
          setTimeout(() => onLoginSuccess(user), 800);
        },
        () => {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("expired");
          deleteQRSession(id).catch(() => {});
        }
      );
    } catch {
      setPhase("waiting");
      createLocalQRSession(id);
      cleanupRef.current = watchQRSession(
        id,
        (user) => {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("approved");
          deleteQRSession(id).catch(() => {});
          setTimeout(() => onLoginSuccess(user), 800);
        },
        () => {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("expired");
          deleteQRSession(id).catch(() => {});
        }
      );
    }
  }, [onLoginSuccess]);

  React.useEffect(() => {
    if (open) startSession();
    return () => {
      cleanupRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  const handleClose = () => {
    cleanupRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);
    if (sessionId) deleteQRSession(sessionId).catch(() => {});
    onClose();
  };

  const isDark = theme === "dark";
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "relative rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-5",
          isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
        )}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
        >
          ×
        </button>

        <div className="text-center">
          <p className={cn("font-black text-lg tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Đăng nhập bằng QR
          </p>
          <p className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            Mở app trên điện thoại và quét mã bên dưới
          </p>
        </div>

        {phase === "generating" && (
          <div className="w-52 h-52 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#107C41] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {phase === "waiting" && qrUrl && (
          <>
            <div className={cn(
              "p-4 rounded-xl border-2",
              isDark ? "bg-white border-slate-700" : "bg-white border-slate-100"
            )}>
              <QRCodeSVG
                value={qrUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
                Mã hết hạn sau
              </p>
              <span className={cn(
                "font-mono text-xl font-bold tabular-nums",
                secondsLeft <= 30 ? "text-red-500" : "text-[#107C41]"
              )}>
                {mins}:{secs}
              </span>
            </div>
            <div className={cn(
              "w-full text-center text-[11px] px-4 py-2 rounded-lg",
              isDark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
            )}>
              Mở app trên đt đã đăng nhập → quét QR → xác nhận
            </div>
          </>
        )}

        {phase === "approved" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 bg-[#107C41]/10 rounded-full flex items-center justify-center text-4xl">
              ✓
            </div>
            <p className="font-bold text-[#107C41] text-lg">Đăng nhập thành công!</p>
          </div>
        )}

        {phase === "expired" && (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className={cn("text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
              Mã QR đã hết hạn
            </p>
            <button
              onClick={startSession}
              className="px-5 py-2 rounded-lg bg-[#107C41] text-white text-sm font-semibold hover:bg-[#0d6535] transition-colors"
            >
              Tạo mã mới
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className={cn("text-sm text-red-500")}>Không thể tạo phiên. Kiểm tra kết nối.</p>
            <button
              onClick={startSession}
              className="px-5 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        <p className={cn("text-[10px] text-center", isDark ? "text-slate-600" : "text-slate-300")}>
          Chỉ dùng được khi điện thoại đã đăng nhập Google vào app này
        </p>
      </div>
    </div>
  );
}

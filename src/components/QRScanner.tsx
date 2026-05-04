import * as React from "react";
import jsQR from "jsqr";
import { approveQRSession } from "../lib/qrAuth";
import { User } from "firebase/auth";
import { cn } from "@/lib/utils";

interface Props {
  user: User;
  theme: "light" | "dark";
  onClose: () => void;
}

type Phase = "scanning" | "confirming" | "loading" | "success" | "error" | "no-camera";

export function QRScanner({ user, theme, onClose }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const [phase, setPhase] = React.useState<Phase>("scanning");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");
  const isDark = theme === "dark";

  const stopCamera = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const scanLoop = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code && code.data) {
      try {
        const url = new URL(code.data);
        const sid = url.searchParams.get("qrSession");
        if (sid) {
          stopCamera();
          setSessionId(sid);
          setPhase("confirming");
          return;
        }
      } catch {}
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [stopCamera]);

  React.useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => {
            rafRef.current = requestAnimationFrame(scanLoop);
          }).catch(() => {
            if (mounted) setPhase("no-camera");
          });
        }
      })
      .catch(() => {
        if (mounted) setPhase("no-camera");
      });
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [scanLoop, stopCamera]);

  const handleConfirm = async () => {
    if (!sessionId) return;
    setPhase("loading");
    try {
      await approveQRSession(sessionId, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      setPhase("success");
      setTimeout(onClose, 1800);
    } catch {
      setPhase("error");
      setErrorMsg("Không thể gửi xác nhận. Thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-sm">
        <p className="text-white font-bold text-sm">
          {phase === "scanning" ? "Hướng camera vào mã QR" : "Xác nhận đăng nhập"}
        </p>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-lg"
        >
          ×
        </button>
      </div>

      {/* Camera view */}
      {(phase === "scanning") && (
        <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover bg-black"
          />
          <canvas ref={canvasRef} className="hidden" />
          {/* Viewfinder */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 sm:w-64 sm:h-64 relative">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#107C41] rounded-tl-md" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#107C41] rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#107C41] rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#107C41] rounded-br-md" />
              <div className="absolute left-4 right-4 top-0 h-0.5 bg-[#107C41]/70 animate-scan-line" />
            </div>
          </div>
          <p className="absolute bottom-8 left-0 right-0 text-center text-white/70 text-xs px-8">
            Hướng camera vào mã QR trên màn hình máy tính
          </p>
        </div>
      )}

      {/* Confirm screen */}
      {(phase === "confirming" || phase === "loading" || phase === "error") && (
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className={cn(
            "rounded-2xl shadow-2xl p-8 w-full max-w-xs mx-4 flex flex-col items-center gap-5",
            isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
          )}>
            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-[#107C41]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#107C41]">
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center">
              <p className={cn("font-black text-base", isDark ? "text-white" : "text-slate-900")}>
                Đăng nhập vào máy tính?
              </p>
              <p className={cn("text-sm mt-1 font-medium", isDark ? "text-slate-300" : "text-slate-600")}>
                {user.displayName || user.email}
              </p>
              <p className={cn("text-xs mt-0.5", isDark ? "text-slate-500" : "text-slate-400")}>
                {user.email}
              </p>
            </div>
            {phase === "error" && (
              <p className="text-xs text-red-500 text-center">{errorMsg}</p>
            )}
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleConfirm}
                disabled={phase === "loading"}
                className={cn(
                  "w-full py-2.5 rounded-xl font-bold text-sm text-white transition-colors",
                  phase === "loading"
                    ? "bg-[#107C41]/50 cursor-not-allowed"
                    : "bg-[#107C41] hover:bg-[#0d6535]"
                )}
              >
                {phase === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xác nhận…
                  </span>
                ) : (phase === "error" ? "Thử lại" : "Xác nhận đăng nhập")}
              </button>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                disabled={phase === "loading"}
                className={cn(
                  "w-full py-2 rounded-xl font-medium text-sm transition-colors",
                  isDark
                    ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success screen */}
      {phase === "success" && (
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-[#107C41]/20 rounded-full flex items-center justify-center text-5xl">
              ✓
            </div>
            <p className="font-bold text-[#107C41] text-xl text-center">Đã xác nhận!</p>
            <p className="text-white/60 text-sm text-center">Máy tính đang đăng nhập…</p>
          </div>
        </div>
      )}

      {/* No camera */}
      {phase === "no-camera" && (
        <div className="flex-1 flex items-center justify-center bg-black px-8">
          <div className="text-center">
            <p className="text-white font-bold text-lg mb-2">Không truy cập được camera</p>
            <p className="text-white/60 text-sm mb-6">Hãy cho phép truy cập camera trong cài đặt trình duyệt</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#107C41] text-white font-semibold text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

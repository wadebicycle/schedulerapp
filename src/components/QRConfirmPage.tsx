import * as React from "react";
import { approveQRSession } from "../lib/qrAuth";
import { User } from "firebase/auth";
import { cn } from "@/lib/utils";

interface Props {
  sessionId: string;
  user: User;
  theme: "light" | "dark";
  onDone: () => void;
}

type Phase = "idle" | "loading" | "success" | "error";

export function QRConfirmPage({ sessionId, user, theme, onDone }: Props) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const isDark = theme === "dark";

  const handleConfirm = async () => {
    setPhase("loading");
    try {
      await approveQRSession(sessionId, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      setPhase("success");
      setTimeout(onDone, 1500);
    } catch {
      setPhase("error");
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    )}>
      <div className={cn(
        "rounded-2xl shadow-2xl p-8 w-full max-w-xs mx-4 flex flex-col items-center gap-5",
        isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"
      )}>
        {phase === "success" ? (
          <>
            <div className="w-16 h-16 bg-[#107C41]/10 rounded-full flex items-center justify-center text-4xl">✓</div>
            <p className="font-bold text-[#107C41] text-lg text-center">Đã xác nhận! Máy tính đang đăng nhập…</p>
          </>
        ) : (
          <>
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
              <p className="text-xs text-red-500 text-center">Lỗi. Thử lại.</p>
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
                ) : "Xác nhận đăng nhập"}
              </button>
              <button
                onClick={onDone}
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
          </>
        )}
      </div>
    </div>
  );
}

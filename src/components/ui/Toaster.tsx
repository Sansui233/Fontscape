import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";
import { X } from "lucide-react";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-32px))]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] shadow-lg bg-popover",
            toast.tone === "error" ? "border-destructive/40 text-destructive" : "border-border"
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button type="button" onClick={() => dismiss(toast.id)} className="opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

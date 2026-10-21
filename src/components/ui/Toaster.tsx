import { FontChangesNotice } from "@/components/font/FontChangesNotice";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";
import { StackItem } from "./StackItem";

/**
 * 右上角（标题栏下方）的通知栈：常驻的目录变化提示在最上面（带关闭按钮），
 * 其后是会自动消失的 toast（不需要关闭按钮）
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const remove = useToastStore((state) => state.remove);

  return (
    <div className="fixed top-14 right-4 z-[60] flex flex-col items-end max-w-[calc(100vw-32px)] pointer-events-none">
      <FontChangesNotice />
      {toasts.map((toast) => (
        <StackItem key={toast.id} open={!toast.leaving} onExited={() => remove(toast.id)}>
          <div
            role="status"
            className={cn(
              "max-w-[280px] rounded-lg border px-3 py-2 text-[13px] bg-popover shadow-sm",
              toast.tone === "error" ? "border-destructive/40 text-destructive" : "border-border"
            )}
          >
            {toast.message}
          </div>
        </StackItem>
      ))}
    </div>
  );
}

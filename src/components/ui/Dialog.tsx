import { cn } from "@/lib/utils";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ title, onClose, children, footer, className }: DialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className={cn(
          "w-[min(400px,calc(100vw-32px))] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl",
          className
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 text-[15px] font-semibold">{title}</div>
        <div className="px-5 pb-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

type ButtonTone = "default" | "primary" | "danger";

export function DialogButton({
  tone = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      type="button"
      className={cn(
        "h-7 px-3 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        tone === "default" && "border border-border bg-background hover:bg-muted",
        tone === "primary" && "bg-brand text-brand-foreground hover:bg-brand/90",
        tone === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        className
      )}
      {...props}
    />
  );
}

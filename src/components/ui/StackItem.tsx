import { ReactNode } from "react";

/**
 * 通知栈中的一项。open 变为 false 时播放离开动画（滑出并收起高度），结束后调用 onExited。
 * 间距放在项内部，收起时一并消失，其余通知平滑移动。
 */
export function StackItem({
  open,
  onExited,
  children,
}: {
  open: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="stack-item"
      data-leaving={open ? undefined : ""}
      onTransitionEnd={(event) => {
        if (!open && event.target === event.currentTarget && event.propertyName === "grid-template-rows") {
          onExited();
        }
      }}
    >
      {/* 收起高度时裁掉内容；左右留 4px 给 shadow-sm */}
      <div className="min-h-0 overflow-hidden -mx-1 px-1">
        <div className="pb-2 pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}

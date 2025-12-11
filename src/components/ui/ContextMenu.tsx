import { useEffect, useRef, ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;  // 危险操作（红色）
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

export function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 点击外部关闭
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // ESC 键关闭
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // 调整菜单位置，确保不超出视口
  const menuHeight = items.length * 40 + 20;
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 200),
    y: Math.min(y, window.innerHeight - menuHeight),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={`
            w-full px-4 py-2 text-left text-sm flex items-center gap-2
            hover:bg-accent transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${item.danger ? 'text-destructive hover:text-destructive' : 'text-foreground'}
          `}
        >
          {item.icon && <span className="w-4 h-4">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

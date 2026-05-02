import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({ open: false, setOpen: () => {} });

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

function DropdownMenuTrigger({ asChild, children, ...props }: { asChild?: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>) {
  const { open, setOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        handleClick(e);
        (children as any).props?.onClick?.(e);
      }
    });
  }

  return (
    <span onClick={handleClick} style={{ display: 'inline-flex' }} {...props}>
      {children}
    </span>
  );
}

function DropdownMenuContent({
  children,
  className,
  align = "end",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
} & React.HTMLAttributes<HTMLDivElement>) {
  const { open } = React.useContext(DropdownMenuContext);

  if (!open) return null;

  const alignClass = align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={cn(
        "absolute top-full mt-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl animate-in fade-in-0 zoom-in-95",
        alignClass,
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuLabel({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-3 py-2 text-sm", className)} {...props}>
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("h-px bg-slate-100 dark:bg-slate-700 my-1", className)} {...props} />
  );
}

function DropdownMenuItem({
  children,
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClick?: () => void }) {
  const { setOpen } = React.useContext(DropdownMenuContext);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}

/* eslint-disable react-refresh/only-export-components */
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const DEFAULT_OFFSET = "calc(env(safe-area-inset-top, 0px) + 16px)";
const TOAST_LAYER_CLASS = "z-[2147483647]";

const Toaster = ({ className, toastOptions, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      {...props}
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset={DEFAULT_OFFSET}
      className={`toaster group ${TOAST_LAYER_CLASS}${className ? ` ${className}` : ""}`}
      toastOptions={{
        ...toastOptions,
        classNames: {
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          ...toastOptions?.classNames,
          toast: `group toast ${TOAST_LAYER_CLASS} group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg${toastOptions?.classNames?.toast ? ` ${toastOptions.classNames.toast}` : ""}`,
        },
      }}
    />
  );
};

export { Toaster, toast };

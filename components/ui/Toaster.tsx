"use client";
import { Toaster as Sonner } from "sonner";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";

// One toaster for the whole app, below the header, so it never covers the
// crew's send button or the tab bar at the bottom of a phone. 116 px clears
// the two-row project header (brand row plus tabs, 107 px measured at 1440
// and 390); at 76 the toast sat on the tabs.
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="dark"
      offset={{ top: 116 }}
      mobileOffset={{ top: "calc(116px + env(safe-area-inset-top))", left: 12, right: 12 }}
      gap={8}
      visibleToasts={3}
      duration={4000}
      icons={{
        success: <CircleCheck size={18} strokeWidth={1.75} />,
        error: <CircleAlert size={18} strokeWidth={1.75} />,
        info: <Info size={18} strokeWidth={1.75} />,
        warning: <TriangleAlert size={18} strokeWidth={1.75} />,
        loading: <LoaderCircle size={18} strokeWidth={1.75} className="bt-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "bt-toast",
          title: "bt-title",
          description: "bt-desc",
          actionButton: "bt-action",
          success: "bt-success",
          error: "bt-error",
        },
      }}
    />
  );
}

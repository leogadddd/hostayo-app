"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  CheckCircle as CircleCheck,
  XCircle as CircleX,
  Info,
  CircleNotch as LoaderCircle,
  Warning as TriangleAlert,
} from "@/components/ui/icons";
import { Toaster as Sonner, toast } from "sonner";

const FLASH_KEY = "hostayo-toast";
const FLASH_EVENT = "hostayo:toast";

export type ToastKind = "success" | "error" | "info" | "warning";

export function setToastAfterNavigation(kind: ToastKind, message: string) {
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ kind, message }));
  window.dispatchEvent(new Event(FLASH_EVENT));
}

const PHONE_QUERY = "(max-width: 1023px)";

/** True below `lg`, where the tab bar and floating button own the bottom edge. */
function usePhoneLayout() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(PHONE_QUERY);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

export function HostayoToaster() {
  const phone = usePhoneLayout();
  useEffect(() => {
    function showNavigationToast() {
      const value = sessionStorage.getItem(FLASH_KEY);
      if (!value) return;
      sessionStorage.removeItem(FLASH_KEY);
      try {
        const flash = JSON.parse(value) as {
          kind?: ToastKind;
          message?: string;
        };
        if (flash.kind && flash.message) toast[flash.kind](flash.message);
      } catch {
        // Ignore invalid or stale browser data.
      }
    }

    showNavigationToast();
    window.addEventListener(FLASH_EVENT, showNavigationToast);
    return () => window.removeEventListener(FLASH_EVENT, showNavigationToast);
  }, []);

  return (
    <Sonner
      className="hostayo-toaster"
      position={phone ? "top-center" : "bottom-right"}
      offset={
        phone
          ? {
              top: "calc(env(safe-area-inset-top) + 12px)",
              left: 12,
              right: 12,
            }
          : { bottom: 18, right: 18 }
      }
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 12px)",
        right: 12,
        left: 12,
      }}
      duration={4500}
      gap={10}
      visibleToasts={4}
      closeButton
      icons={{
        success: <CircleCheck className="h-5 w-5" />,
        error: <CircleX className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        warning: <TriangleAlert className="h-5 w-5" />,
        loading: <LoaderCircle className="h-5 w-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "hostayo-toast",
          title: "hostayo-toast-title",
          description: "hostayo-toast-description",
          closeButton: "hostayo-toast-close",
        },
      }}
    />
  );
}

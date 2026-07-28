"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme: "light";
        },
      ) => string;
    };
  }
}

export function TurnstileWidget({
  onToken,
  siteKey,
}: {
  onToken: (token: string) => void;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  const renderWidget = useCallback(() => {
    if (rendered.current || !containerRef.current || !window.turnstile) return;

    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
      theme: "light",
    });
    rendered.current = true;
  }, [onToken, siteKey]);

  return (
    <>
      <div
        ref={containerRef}
        className="min-h-[65px]"
        aria-label="Verificación de seguridad"
      />
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => onToken("")}
      />
    </>
  );
}

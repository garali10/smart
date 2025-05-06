/**
 * Type definitions for Google reCAPTCHA v3
 */

interface Window {
  grecaptcha: {
    ready: (callback: () => void) => void;
    execute: (siteKey: string, options: { action: string }) => Promise<string>;
    render: (container: string | HTMLElement, parameters: object) => number;
    reset: (widgetId?: number) => void;
  };
} 
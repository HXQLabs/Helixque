import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      // System notifications (partner left, connected, etc.) at top-right
      position="top-right"
      expand={false}
      richColors={false}
      theme="dark"
      closeButton={false}
      toastOptions={{
        style: {
          background: 'rgba(32,32,32,0.95)',
          border: '1px solid rgba(80,80,80,0.6)',
          color: 'white',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)'
        },
        className: 'toast',
        duration: 2400,
      }}
    />
  );
}

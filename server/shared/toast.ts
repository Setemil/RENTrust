// A toast is a short message the web app pops up in the corner of the screen. The server
// sends one by adding a `toast` field to any JSON response:
//
//   res.json({ ok: true, toast: toast.success("RT-0007 is live") });
//
// Errors don't need this: app.ts adds an error toast to every thrown error the user can't
// fix by editing a form (403, 404, 409 and server errors). Form problems (400, 401) carry
// no toast, so the page shows them beside the form instead.

export type Toast = {
  kind: "success" | "info" | "error";
  message: string;
  // A short reference the user can quote to support. Set on server errors.
  reference?: string;
};

export const toast = {
  success: (message: string): Toast => ({ kind: "success", message }),
  info: (message: string): Toast => ({ kind: "info", message }),
  error: (message: string, reference?: string): Toast => ({ kind: "error", message, reference }),
};

// Which error statuses pop up as a toast.
export const isToastStatus = (status: number) => status === 403 || status === 404 || status === 409 || status >= 500;

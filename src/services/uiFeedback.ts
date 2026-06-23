type NoticeType = "success" | "error" | "info" | "warning";

export interface NoticePayload {
  title: string;
  message?: string;
  type?: NoticeType;
}

export interface ConfirmPayload {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  resolve: (accepted: boolean) => void;
}

export const notify = (payload: NoticePayload) => {
  window.dispatchEvent(new CustomEvent("sumaq:notify", { detail: payload }));
};

export const confirmAction = (payload: Omit<ConfirmPayload, "resolve">) => {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent("sumaq:confirm", { detail: { ...payload, resolve } }));
  });
};

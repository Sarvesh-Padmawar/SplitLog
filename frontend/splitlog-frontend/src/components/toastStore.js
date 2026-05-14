/* ──────────────── Store ──────────────── */
let toastListeners = [];
let toastId = 0;

export function showToast(message, type = "success", duration = 3500) {
  const id = ++toastId;
  toastListeners.forEach((fn) => fn({ id, message, type, duration }));
}

export const getToastListeners = () => toastListeners;
export const setToastListeners = (newListeners) => {
  toastListeners = newListeners;
};

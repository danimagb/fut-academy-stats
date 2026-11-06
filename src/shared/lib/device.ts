/** A short vibration, where the phone supports it (confirms a tap on the game screen). */
export const buzz = (): void => {
  navigator.vibrate?.(35);
};

/** Saves `data` as a file (falls back here where sharing isn't available). */
export function download(filename: string, data: Blob | string, type?: string): void {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], type ? { type } : {}));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

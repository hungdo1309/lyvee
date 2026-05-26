import type { DialogButton, DialogOptions } from '../context/DialogContext';

type AlertFn = (
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogOptions
) => void;

let alertFn: AlertFn | null = null;

export function registerDialogAlert(fn: AlertFn | null) {
  alertFn = fn;
}

/** Branded dialog — drop-in replacement for React Native `Alert.alert`. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogOptions
) {
  if (alertFn) {
    alertFn(title, message, buttons, options);
    return;
  }

  console.warn('[appAlert] DialogProvider is not mounted.');
}

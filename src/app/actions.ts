// Buttons say what they do with `data-action` (and arguments in other data-* attributes). One
// click listener on the document finds the handler for it. Pages and features add theirs with
// `registerActions`.
import { closeMenus } from '@/shared/ui/bar';

/** A handler gets the element's dataset and the element. */
export type ActionHandler = (data: DOMStringMap, el: HTMLElement) => unknown;

const handlers: Record<string, ActionHandler> = {};

export function registerActions(map: Record<string, ActionHandler>): void {
  for (const [name, fn] of Object.entries(map)) {
    if (handlers[name]) throw new Error(`Action "${name}" is registered twice`);
    handlers[name] = fn;
  }
}

/** A form handler gets the form's data and the form. */
export type FormHandler = (data: FormData, form: HTMLFormElement) => unknown;

const forms: Record<string, FormHandler> = {};

/** Handlers for `<form data-form="name">` submissions (see the submit listener in app/). */
export function registerForms(map: Record<string, FormHandler>): void {
  for (const [name, fn] of Object.entries(map)) {
    if (forms[name]) throw new Error(`Form "${name}" is registered twice`);
    forms[name] = fn;
  }
}

/** The registered handler for a form, if any. */
export const formHandler = (name: string): FormHandler | undefined => forms[name];

export type ClickOptions = {
  /** Swallow this click entirely (e.g. the click that ends a drag). */
  ignore?: (e: MouseEvent) => boolean;
  /** Whether this action may run now (e.g. not a change on a read-only screen); it can explain why not. */
  allow?: (name: string) => boolean;
};

/** Installs the document click listener (once, at startup). */
export function installActionListener({ ignore = () => false, allow = () => true }: ClickOptions = {}): void {
  document.addEventListener('click', (e) => {
    if (ignore(e)) {
      e.preventDefault();
      return;
    }
    const target = e.target as HTMLElement;
    // Any tap closes an open ⋯ menu (except the toggle itself, which handles it).
    if (!target.closest('[data-action="menu-toggle"]')) closeMenus();
    const el = target.closest<HTMLElement & { disabled?: boolean }>('[data-action]');
    if (!el || el.disabled) return;
    const name = el.dataset.action ?? '';
    const fn = handlers[name];
    if (!fn) return;
    e.preventDefault();
    if (!allow(name)) return;
    fn(el.dataset, el);
  });
}

const INTERACTIVE_FORM_SELECTOR = [
  'form',
  'input:not([type="hidden"])',
  'textarea',
  'select',
  'generic-input',
  'interaction-scope',
].join(',');

export function hasStaticInteractiveControls(root: Element | null): boolean {
  if (!root) {
    return false;
  }

  return !!root.querySelector(INTERACTIVE_FORM_SELECTOR);
}

export function hasStaticRenderableContent(root: Element | null): boolean {
  if (!root) {
    return false;
  }

  return String(root.textContent ?? '').trim().length > 0;
}

export function hasProtectedSsrShell(root: Element | null): boolean {
  return root?.getAttribute('data-zlp-protected-shell') === 'true';
}

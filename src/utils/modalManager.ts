// (2026-07-13) Global LIFO modal and overlay registry per SKILL.md Rule 16
export interface ModalEntry {
  id: string;
  close: () => void;
}

const modalStack: ModalEntry[] = [];

export function pushModal(id: string, close: () => void): () => void {
  // Remove if already exists to avoid duplicates
  const existingIdx = modalStack.findIndex((m) => m.id === id);
  if (existingIdx !== -1) {
    modalStack.splice(existingIdx, 1);
  }
  const entry = { id, close };
  modalStack.push(entry);
  window.dispatchEvent(new CustomEvent('keepsake:modal-stack-changed', { detail: { count: modalStack.length } }));

  return () => {
    const idx = modalStack.indexOf(entry);
    if (idx !== -1) {
      modalStack.splice(idx, 1);
      window.dispatchEvent(new CustomEvent('keepsake:modal-stack-changed', { detail: { count: modalStack.length } }));
    }
  };
}

export function popModal(): boolean {
  if (modalStack.length === 0) return false;
  const top = modalStack.pop();
  if (top) {
    top.close();
    window.dispatchEvent(new CustomEvent('keepsake:modal-stack-changed', { detail: { count: modalStack.length } }));
    return true;
  }
  return false;
}

export function closeAllModals(): boolean {
  if (modalStack.length === 0) return false;
  const count = modalStack.length;
  // Clone stack to avoid mutation during iteration
  const entries = [...modalStack].reverse();
  modalStack.length = 0;
  entries.forEach((m) => m.close());
  window.dispatchEvent(new CustomEvent('keepsake:modal-stack-changed', { detail: { count: 0 } }));
  return count > 0;
}

export function getOpenModalCount(): number {
  return modalStack.length;
}

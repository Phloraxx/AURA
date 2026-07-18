export interface DynamicObserver {
  disconnect(): void;
}

function containsOnlyAuraNodes(record: MutationRecord): boolean {
  const added = Array.from(record.addedNodes);
  return (
    added.length > 0 &&
    added.every(
      (node) =>
        node instanceof Element &&
        (node.hasAttribute('data-aura-owned') ||
          node.closest('[data-aura-owned]') !== null),
    )
  );
}

export function observeDynamicPage(
  document: Document,
  onMeaningfulChange: () => void,
  debounceMs = 300,
): DynamicObserver {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver((records) => {
    if (records.every(containsOnlyAuraNodes)) return;
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = setTimeout(onMeaningfulChange, debounceMs);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return {
    disconnect() {
      observer.disconnect();
      if (timeout !== undefined) clearTimeout(timeout);
    },
  };
}

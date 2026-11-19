// Blanks in ring numbers are significant, so they are shown as
// non-breaking spaces to keep the browser from collapsing them.
export function withVisibleBlanks(value: string) {
  return value.replaceAll(" ", "\u00a0");
}

export function RingNumber({ value }: { value: string }) {
  return <span className="font-monospace">{withVisibleBlanks(value)}</span>;
}

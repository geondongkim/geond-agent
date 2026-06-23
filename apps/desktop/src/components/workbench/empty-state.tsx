export function EmptyState({ text }: { readonly text: string }) {
  return (
    <div className="px-1 py-4 text-sm leading-6 text-[color:var(--ink-soft)]">
      {text}
    </div>
  );
}

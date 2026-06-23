export function EmptyState({ text }: { readonly text: string }) {
  return (
    <div className="rounded-md bg-[color:var(--panel-muted)] p-5 text-sm leading-6 text-[color:var(--ink-soft)]">
      {text}
    </div>
  );
}

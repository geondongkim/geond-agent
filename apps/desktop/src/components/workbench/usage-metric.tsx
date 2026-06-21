export function UsageMetric({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="usage-metric">
      <p className="muted-meta">{label}</p>
      <p className="mt-1 font-mono text-sm text-[color:var(--ink)]">{value}</p>
    </div>
  );
}

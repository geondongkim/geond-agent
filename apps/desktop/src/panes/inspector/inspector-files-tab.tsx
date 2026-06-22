import type { UiI18n } from "@geond-agent/ui-workbench";
import type { ReactNode } from "react";
import { FileDiff, FileText, FolderOpen, ShieldCheck } from "lucide-react";

import { TabsContent } from "../../components/ui/tabs.js";
import { EmptyState } from "../../components/workbench/empty-state.js";
import {
  createFileEvidencePreviewModel,
  formatDiffStat,
  formatEvidenceRange,
  type FileEvidenceChangedFileItem,
  type FileEvidenceContextItem
} from "../../lib/file-evidence.js";
import type { InspectorSessionReadModel } from "../../lib/inspector-read-model.js";
import { formatContextKindLabel } from "../../lib/workbench-format.js";
import type { ProjectedActiveSession } from "../../lib/workbench-types.js";

export function InspectorFilesTab({
  activeSession,
  inspectorData,
  i18n
}: {
  readonly activeSession?: ProjectedActiveSession;
  readonly inspectorData?: InspectorSessionReadModel;
  readonly i18n: UiI18n;
}) {
  const model = createFileEvidencePreviewModel({ activeSession, inspectorData });
  const hasEvidence = model.contextCount > 0 || model.changedFileCount > 0;

  return (
    <TabsContent value="files" className="border-0 bg-transparent p-0">
      <div className="file-evidence-hero">
        <div className="flex min-w-0 items-start gap-3">
          <span className="file-evidence-hero-icon">
            <FolderOpen size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{i18n.t("workbench.files.evidenceTitle")}</p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
              {i18n.t("workbench.files.evidenceDetail")}
            </p>
          </div>
        </div>
        <div className="file-evidence-metrics">
          <EvidenceMetric
            label={i18n.t("workbench.files.attachedContext")}
            value={String(model.contextCount)}
          />
          <EvidenceMetric
            label={i18n.t("workbench.files.changedFiles")}
            value={String(model.changedFileCount)}
          />
          <EvidenceMetric
            label={i18n.t("workbench.files.privacyBoundary")}
            value={i18n.t("workbench.context.metadataOnly")}
          />
        </div>
      </div>

      {hasEvidence ? (
        <div className="mt-3 space-y-3">
          <EvidenceSection
            count={model.changedFileCount}
            title={i18n.t("workbench.files.changedFiles")}
          >
            {model.changedFileItems.length ? (
              <div className="space-y-2">
                {model.changedFileItems.map((item) => (
                  <ChangedFileCard key={item.id} i18n={i18n} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState text={i18n.t("workbench.files.noChangedFiles")} />
            )}
          </EvidenceSection>

          <EvidenceSection
            count={model.contextCount}
            title={i18n.t("workbench.files.attachedContext")}
          >
            {model.contextItems.length ? (
              <div className="space-y-2">
                {model.contextItems.map((item) => (
                  <ContextEvidenceCard key={item.id} i18n={i18n} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState text={i18n.t("workbench.context.empty")} />
            )}
          </EvidenceSection>
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState text={i18n.t("workbench.files.noEvidence")} />
        </div>
      )}
    </TabsContent>
  );
}

function EvidenceSection({
  children,
  count,
  title
}: {
  readonly children: ReactNode;
  readonly count: number;
  readonly title: string;
}) {
  return (
    <section className="file-evidence-section">
      <div className="review-section-heading">
        <h3>{title}</h3>
        <span className="metric-pill">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ChangedFileCard({
  i18n,
  item
}: {
  readonly i18n: UiI18n;
  readonly item: FileEvidenceChangedFileItem;
}) {
  return (
    <article className="file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon file-evidence-icon-diff">
          <FileDiff size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{item.changeKind}</p>
          <h4 className="truncate font-mono text-sm font-semibold">{item.path}</h4>
        </div>
        <span className="status-pill status-neutral">
          {formatDiffStat({ additions: item.additions, deletions: item.deletions })}
        </span>
      </div>
      <dl className="file-evidence-details">
        <EvidenceDetail label={i18n.t("workbench.files.diffSource")} value={item.diffTitle ?? item.diffId} />
        {item.diffSummary ? (
          <EvidenceDetail label={i18n.t("workbench.context.summary")} value={item.diffSummary} />
        ) : null}
      </dl>
    </article>
  );
}

function ContextEvidenceCard({
  i18n,
  item
}: {
  readonly i18n: UiI18n;
  readonly item: FileEvidenceContextItem;
}) {
  return (
    <article className="file-evidence-card">
      <div className="file-evidence-card-header">
        <span className="file-evidence-icon">
          <FileText size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="muted-meta">{formatContextKindLabel(i18n, item.kind)}</p>
          <h4 className="truncate text-sm font-semibold">{item.title}</h4>
        </div>
        <span className="status-pill status-neutral">{formatContentState(i18n, item.contentState)}</span>
      </div>
      <dl className="file-evidence-details">
        {item.path ? <EvidenceDetail label={i18n.t("workbench.context.path")} value={item.path} /> : null}
        {item.range ? (
          <EvidenceDetail
            label={i18n.t("workbench.context.range")}
            value={formatEvidenceRange(item.range)}
          />
        ) : null}
        <EvidenceDetail label={i18n.t("workbench.context.provenance")} value={item.provenance} />
        {item.summary ? (
          <EvidenceDetail label={i18n.t("workbench.context.summary")} value={item.summary} />
        ) : null}
      </dl>
    </article>
  );
}

function EvidenceMetric({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="file-evidence-metric">
      <ShieldCheck size={14} />
      <div className="min-w-0">
        <p className="muted-meta">{label}</p>
        <p className="truncate text-xs font-semibold text-[color:var(--ink)]">{value}</p>
      </div>
    </div>
  );
}

function EvidenceDetail({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt className="muted-meta">{label}</dt>
      <dd className="mt-1 break-words font-mono text-[color:var(--ink-soft)]">{value}</dd>
    </div>
  );
}

function formatContentState(i18n: UiI18n, value: string): string {
  switch (value) {
    case "metadata-only":
      return i18n.t("workbench.context.metadataOnly");
    case "redacted":
      return i18n.t("workbench.files.redacted");
    case "external-reference":
      return i18n.t("workbench.files.externalReference");
    default:
      return value;
  }
}

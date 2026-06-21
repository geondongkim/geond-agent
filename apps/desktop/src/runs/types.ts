import type { DesktopDemoDocument } from "../demo-workbench.js";

export type RunnerRequest = ReturnType<DesktopDemoDocument["createRunnerRequest"]>;
export type RunnerResult = Awaited<ReturnType<DesktopDemoDocument["runSession"]>>;

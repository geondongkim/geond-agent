import type { DesktopDemoDocument } from "../demo-workbench.js";

export type ProjectedSessionListItem =
  DesktopDemoDocument["initialControllerSnapshot"]["projection"]["sessions"][number];

export type ProjectedActiveSession = NonNullable<
  DesktopDemoDocument["initialControllerSnapshot"]["projection"]["activeSession"]
>;

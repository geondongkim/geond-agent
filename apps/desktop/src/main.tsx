import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";
import { createDesktopDemoDocument } from "./demo-workbench.js";
import { createDesktopLocalSettingsStore } from "./persistence/tauri-settings.js";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container");
}

const root = createRoot(container);
const documentModel = await createDesktopDemoDocument(createDesktopLocalSettingsStore());

root.render(
  <StrictMode>
    <App document={documentModel} />
  </StrictMode>
);

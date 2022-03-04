import { ExtensionContext } from "@foxglove/studio";
import { initThreeDeePanel } from "./ThreeDeePanel";

export function activate(extensionContext: ExtensionContext) {
  extensionContext.registerPanel({ name: "threedee-panel", initPanel: initThreeDeePanel });
}

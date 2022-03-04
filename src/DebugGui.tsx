import { useEffect, useState } from "react";
import { GUI } from "three/examples/jsm/libs/dat.gui.module";

import { Renderer } from "./Renderer";
import { useRenderer } from "./RendererContext";

export function DebugGui(): JSX.Element {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const renderer = useRenderer();

  useEffect(() => {
    if (!renderer || !div) {
      return;
    }

    const gui = createDebugGui(renderer, div);
    return () => void div.removeChild(gui.domElement);
  }, [div, renderer]);

  return <div ref={setDiv} />;
}

function createDebugGui(renderer: Renderer, div: HTMLDivElement): GUI {
  const gui = new GUI({ autoPlace: false, width: 300 });
  div.appendChild(gui.domElement);

  const rendererFolder = gui.addFolder("Renderer");
  rendererFolder.add(renderer.gl, "toneMappingExposure", 0, 2, 0.01);
  rendererFolder.add(renderer.gl, "physicallyCorrectLights", false);

  return gui;
}

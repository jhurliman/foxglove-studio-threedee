import { ArgumentMap } from "eventemitter3";
import { createContext, useContext, useEffect } from "react";

import { Renderer, RendererEvents } from "./Renderer";

export const RendererContext = createContext<Renderer | null>(null);

export function useRenderer(): Renderer | undefined {
  const renderer = useContext(RendererContext);
  return renderer ?? undefined;
}

export function useRendererEvent<K extends keyof RendererEvents>(
  eventName: K,
  listener: (...args: ArgumentMap<RendererEvents>[Extract<K, keyof RendererEvents>]) => void,
): void {
  const renderer = useRenderer();

  useEffect(() => {
    renderer?.addListener(eventName, listener);
    return () => void renderer?.removeListener(eventName, listener);
  }, [listener, eventName, renderer]);
}

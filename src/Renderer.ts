import * as THREE from "three";
import EventEmitter from "eventemitter3";

import { Input } from "./Input";

export type RendererEvents = {
  startFrame: (delta: number, renderer: Renderer) => void;
  endFrame: (delta: number, renderer: Renderer) => void;
  renderableSelected: (renderable: THREE.Object3D) => void;
};

export class Renderer extends EventEmitter<RendererEvents> {
  canvas: HTMLCanvasElement;
  gl: THREE.WebGLRenderer;
  input: Input;
  lastFrameTime: number;

  constructor(canvas: HTMLCanvasElement) {
    super();

    this.input = new Input(canvas);
    this.input.on("resize", (size) => {
      this.gl.setPixelRatio(window.devicePixelRatio);
      this.gl.setSize(size.width, size.height);
      // this.resizeHandler(size);
    });
    this.input.on("click", (_cursorCoords) => {
      // this.clickHandler(cursorCoords);
    });

    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    this.gl.info.autoReset = false;

    this.gl.setPixelRatio(window.devicePixelRatio);
    this.gl.setSize(window.innerWidth, window.innerHeight);
    // this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.autoClear = false;
    // this.gl.shadowMap.enabled = false;
    // this.gl.shadowMap.autoUpdate = false;
    // this.gl.shadowMap.needsUpdate = true;
    // this.gl.shadowMap.type = THREE.VSMShadowMap;

    this.lastFrameTime = performance.now();
    this.animationFrame(this.lastFrameTime);
  }

  animationFrame = (time: DOMHighResTimeStamp): void => {
    requestAnimationFrame(this.animationFrame);

    const delta = time - this.lastFrameTime;
    this.lastFrameTime = time;

    this.emit("startFrame", delta, this);
    this.frameHandler(delta);
    this.emit("endFrame", delta, this);

    this.gl.info.reset();
  };

  frameHandler = (_delta: number): void => {};
}

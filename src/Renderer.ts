import * as THREE from "three";
import EventEmitter from "eventemitter3";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import { Input } from "./Input";
import { TransformTree } from "./transforms";
import { Marker, TF } from "./ros";
import { Markers } from "./renderables/Markers";
import { FrameAxes } from "./renderables/FrameAxes";

import "./webgl-memory";
import { TopicErrors } from "./TopicErrors";
import { MaterialCache } from "./MaterialCache";

export type RendererEvents = {
  startFrame: (currentTime: bigint, renderer: Renderer) => void;
  endFrame: (currentTime: bigint, renderer: Renderer) => void;
  renderableSelected: (renderable: THREE.Object3D, renderer: Renderer) => void;
  transformTreeUpdated: (renderer: Renderer) => void;
  showLabel: (labelId: string, labelMarker: Marker, renderer: Renderer) => void;
  removeLabel: (labelId: string, renderer: Renderer) => void;
};

type MemoryInfo = {
  memory: Record<string, number>;
  resources: Record<string, number>;
};

// NOTE: These do not use .convertSRGBToLinear() since background color is not
// affected by gamma correction
const LIGHT_BACKDROP = new THREE.Color(0xececec);
const DARK_BACKDROP = new THREE.Color(0x121217);

export class Renderer extends EventEmitter<RendererEvents> {
  canvas: HTMLCanvasElement;
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  dirLight: THREE.DirectionalLight;
  input: Input;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  materialCache = new MaterialCache();
  topicErrors = new TopicErrors();
  colorScheme: "dark" | "light" | undefined;
  gltfLoader: GLTFLoader;
  transformTree = new TransformTree();
  currentTime: bigint | undefined;
  fixedFrameId: string | undefined;
  renderFrameId: string | undefined;

  frameAxes = new FrameAxes(this);
  markers = new Markers(this);

  constructor(canvas: HTMLCanvasElement) {
    super();

    // NOTE: Global side effect
    THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    if (!this.gl.capabilities.isWebGL2) {
      throw new Error("WebGL2 is not supported");
    }
    this.gl.outputEncoding = THREE.sRGBEncoding;
    this.gl.autoClear = false;
    this.gl.info.autoReset = false;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.VSMShadowMap;
    this.gl.setPixelRatio(window.devicePixelRatio);

    let width = canvas.width;
    let height = canvas.height;
    if (canvas.parentElement) {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      this.gl.setSize(width, height);
    }
    this.gl.toneMapping = THREE.NoToneMapping;
    this.gl.outputEncoding = THREE.sRGBEncoding;
    this.gl.autoClear = false;

    this.gltfLoader = new GLTFLoader();

    this.scene = new THREE.Scene();
    this.scene.add(this.frameAxes);
    this.scene.add(this.markers);

    this.dirLight = new THREE.DirectionalLight();
    this.dirLight.position.set(1, 1, 1);
    this.dirLight.castShadow = true;

    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 500;
    this.dirLight.shadow.bias = -0.00001;

    this.scene.add(this.dirLight);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5));

    this.input = new Input(canvas);
    this.input.on("resize", (size) => this.resizeHandler(size));
    this.input.on("click", (cursorCoords) => this.clickHandler(cursorCoords));

    const fov = 50;
    const near = 0.01; // 1cm
    const far = 10_000; // 10km
    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(1, -3, 1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.controls = new OrbitControls(this.camera, this.gl.domElement);

    this.printMemoryStats();
    setInterval(() => this.printMemoryStats(), 30_000);

    this.animationFrame(performance.now());
  }

  setColorScheme(colorScheme: "dark" | "light"): void {
    console.info(`[Renderer] Setting color scheme to "${colorScheme}"`);
    this.colorScheme = colorScheme;
    this.gl.setClearColor(colorScheme === "dark" ? DARK_BACKDROP : LIGHT_BACKDROP, 1);
  }

  addTransformMessage(tf: TF): void {
    this.frameAxes.addTransformMessage(tf);
  }

  addMarkerMessage(topic: string, marker: Marker): void {
    this.markers.addMarkerMessage(topic, marker);
  }

  removeMarkerMessage(topic: string, ns: string, id: number): void {
    this.markers.removeMarkerMessage(topic, ns, id);
  }

  markerWorldPosition(markerId: string): Readonly<THREE.Vector3> | undefined {
    return this.markers.markerWorldPosition(markerId);
  }

  printMemoryStats(): void {
    const ext = this.gl.getContext().getExtension("GMAN_webgl_memory") as
      | { getMemoryInfo: () => MemoryInfo }
      | undefined;
    if (ext) {
      const info = ext.getMemoryInfo();
      for (const [key, value] of Object.entries(info.memory)) {
        console.info(`[Renderer][Memory] ${key}: ${byteString(value)}`);
      }
      for (const [key, value] of Object.entries(info.resources)) {
        console.info(`[Renderer][Resources] ${key}: ${value}`);
      }
    }
  }

  // Callback handlers

  animationFrame = (_wallTime: DOMHighResTimeStamp): void => {
    requestAnimationFrame(this.animationFrame);
    if (this.currentTime != undefined) {
      this.frameHandler(this.currentTime);
    }
  };

  frameHandler = (currentTime: bigint): void => {
    this.emit("startFrame", currentTime, this);

    this.controls.update();

    // TODO: Remove this hack when the user can set the renderFrameId themselves
    this.fixedFrameId = this.transformTree.frames().keys().next().value as string | undefined;
    this.renderFrameId = this.fixedFrameId;

    this.frameAxes.startFrame(currentTime);
    this.markers.startFrame(currentTime);

    this.gl.clear();
    this.gl.render(this.scene, this.camera);

    this.emit("endFrame", currentTime, this);

    this.gl.info.reset();
  };

  resizeHandler = (size: THREE.Vector2): void => {
    console.debug(`[Renderer] Resizing to ${size.width}x${size.height}`);
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();

    this.gl.setPixelRatio(window.devicePixelRatio);
    this.gl.setSize(size.width, size.height);
  };

  clickHandler = (_cursorCoords: THREE.Vector2): void => {
    //
  };
}

const FILESIZE_SUFFIXES = ["B", "kB", "MB", "GB", "TB"];
function byteString(size: number): string {
  const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  const n = Number((size / Math.pow(1024, i)).toFixed(2));
  return n + " " + FILESIZE_SUFFIXES[i];
}

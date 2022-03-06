import * as THREE from "three";
import EventEmitter from "eventemitter3";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { Input, Size } from "./Input";
import { Transform, TransformTree } from "./transforms";
import { makePose, Pose } from "./transforms/geometry";
import { ColorRGBA, Marker, MarkerType, TF } from "./ros";
import { rosTimeToNanoSec } from "./transforms/time";

export type RendererEvents = {
  startFrame: (currentTime: bigint, renderer: Renderer) => void;
  endFrame: (currentTime: bigint, renderer: Renderer) => void;
  renderableSelected: (renderable: THREE.Object3D, renderer: Renderer) => void;
  transformTreeUpdated: (renderer: Renderer) => void;
};

type CoordinateFrameRenderable = THREE.Object3D & {
  userData: {
    frameId?: string;
    type?: string;
    selectable?: boolean;
    pose?: Pose;
  };
};

type MarkerRenderable = THREE.Object3D & {
  userData: {
    topic?: string;
    marker?: Marker;
    srcTime?: bigint;
    pose?: Pose;
    mesh?: THREE.Mesh;
  };
};

const IDENTITY_POSE = makePose();

const tempPose = makePose();

export class Renderer extends EventEmitter<RendererEvents> {
  canvas: HTMLCanvasElement;
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  input: Input;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  transformTree: TransformTree;
  currentTime: bigint | undefined;

  coordinateFrameRenderables = new Map<string, CoordinateFrameRenderable>();
  markerRenderables = new Map<string, MarkerRenderable>();

  cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

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
    this.gl.outputEncoding = THREE.sRGBEncoding;
    this.gl.autoClear = false;
    this.gl.info.autoReset = false;
    this.gl.setPixelRatio(window.devicePixelRatio);

    let width = canvas.width;
    let height = canvas.height;
    if (canvas.parentElement) {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      this.gl.setSize(width, height);
    }
    // this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.autoClear = false;
    // this.gl.shadowMap.enabled = false;
    // this.gl.shadowMap.autoUpdate = false;
    // this.gl.shadowMap.needsUpdate = true;
    // this.gl.shadowMap.type = THREE.VSMShadowMap;

    this.scene = new THREE.Scene();

    this.input = new Input(canvas);
    this.input.on("resize", (size) => this.resizeHandler(size));
    this.input.on("click", (cursorCoords) => this.clickHandler(cursorCoords));

    const fov = 50;
    const near = 0.001; // 1mm
    const far = 10_000; // 10km
    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(1, -3, 1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.controls = new OrbitControls(this.camera, this.gl.domElement);

    this.transformTree = new TransformTree();

    this.animationFrame(performance.now());
  }

  setColorScheme(colorScheme: "dark" | "light"): void {
    console.info(`[Renderer] Setting color scheme to "${colorScheme}"`);
    this.gl.setClearColor(colorScheme === "dark" ? 0x181818 : 0xe9eaee, 1);
  }

  addTransformMessage(tf: TF): void {
    let frameAdded = false;
    if (!this.transformTree.hasFrame(tf.header.frame_id)) {
      this.addCoordinateFrameRenderable(tf.header.frame_id);
      frameAdded = true;
    }
    if (!this.transformTree.hasFrame(tf.child_frame_id)) {
      this.addCoordinateFrameRenderable(tf.child_frame_id);
      frameAdded = true;
    }

    const stamp = rosTimeToNanoSec(tf.header.stamp);
    const t = tf.transform.translation;
    const q = tf.transform.rotation;
    const transform = new Transform([t.x, t.y, t.z], [q.x, q.y, q.z, q.w]);
    this.transformTree.addTransform(tf.child_frame_id, tf.header.frame_id, stamp, transform);

    if (frameAdded) {
      console.info(`[Renderer] Added transform "${tf.header.frame_id}_T_${tf.child_frame_id}"`);
      this.emit("transformTreeUpdated", this);
    }
  }

  addMarkerMessage(topic: string, marker: Marker): void {
    const markerId = `${topic}:${marker.ns}:${marker.id}`;

    let renderable = this.markerRenderables.get(markerId);
    if (!renderable) {
      renderable = new THREE.Object3D() as MarkerRenderable;
      renderable.name = markerId;
      renderable.userData.topic = topic;
      renderable.userData.marker = marker;
      renderable.userData.srcTime = rosTimeToNanoSec(marker.header.stamp);
      renderable.userData.pose = makePose();

      this.scene.add(renderable);
      this.markerRenderables.set(markerId, renderable);
    }

    this.updateMarkerRenderable(renderable, topic, marker);
  }

  removeMarkerMessage(topic: string, ns: string, id: number): void {
    const markerId = `${topic}:${ns}:${id}`;
    const renderable = this.markerRenderables.get(markerId);
    if (renderable) {
      this.scene.remove(renderable);
      this.markerRenderables.delete(markerId);
    }
  }

  addCoordinateFrameRenderable(frameId: string): void {
    if (this.coordinateFrameRenderables.has(frameId)) return;

    const frame = new THREE.Object3D() as CoordinateFrameRenderable;
    frame.name = frameId;
    frame.userData.frameId = frameId;
    frame.userData.type = "CoordinateFrame";
    frame.userData.selectable = true;
    frame.userData.pose = makePose();

    const AXIS_DEFAULT_LENGTH = 1; // [m]
    const axes = new THREE.AxesHelper(AXIS_DEFAULT_LENGTH);
    frame.add(axes);

    // TODO: <div> floating label

    this.scene.add(frame);
    this.coordinateFrameRenderables.set(frameId, frame);
  }

  updateMarkerRenderable(renderable: MarkerRenderable, topic: string, marker: Marker): void {
    renderable.userData.topic = topic;
    renderable.userData.marker = marker;
    renderable.userData.pose = marker.pose;

    renderable.children.length = 0;

    switch (marker.type) {
      case MarkerType.CUBE:
        const material = new THREE.MeshBasicMaterial();
        setMaterialColor(material, marker.color);
        const cube = new THREE.Mesh(this.cubeGeometry, material);
        cube.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);
        renderable.add(cube);
        break;
      default:
        console.warn(`[Renderer] Unsupported marker type: ${marker.type}`);
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

    // TODO: persist the fixed frame
    const fixedFrameId = this.transformTree.frames().keys().next().value as string | undefined;
    if (fixedFrameId) {
      const renderFrameId = fixedFrameId;

      for (const [frameId, renderable] of this.coordinateFrameRenderables.entries()) {
        updatePose(
          renderable,
          this.transformTree,
          renderFrameId,
          fixedFrameId,
          frameId,
          currentTime,
          currentTime,
        );
      }

      for (const renderable of this.markerRenderables.values()) {
        const marker = renderable.userData.marker!;
        const frameId = marker.header.frame_id;
        const srcTime = marker.frame_locked ? currentTime : renderable.userData.srcTime!;
        updatePose(
          renderable,
          this.transformTree,
          renderFrameId,
          fixedFrameId,
          frameId,
          currentTime,
          srcTime,
        );
      }
    }

    this.gl.clear();
    this.gl.render(this.scene, this.camera);

    this.emit("endFrame", currentTime, this);

    this.gl.info.reset();
  };

  resizeHandler = (size: Size): void => {
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();

    this.gl.setPixelRatio(window.devicePixelRatio);
    this.gl.setSize(size.width, size.height);
  };

  clickHandler = (_cursorCoords: THREE.Vector2): void => {
    //
  };
}

function setMaterialColor(
  output: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
  color: Readonly<ColorRGBA>,
): void {
  output.color.r = color.r;
  output.color.g = color.g;
  output.color.b = color.b;
  output.color.convertSRGBToLinear();
  output.opacity = color.a;
}

function updatePose(
  renderable: THREE.Object3D,
  transformTree: TransformTree,
  renderFrameId: string,
  fixedFrameId: string,
  srcFrameId: string,
  dstTime: bigint,
  srcTime: bigint,
): void {
  const pose = renderable.userData.pose as Pose;
  const poseApplied = Boolean(
    transformTree.apply(
      tempPose,
      pose,
      renderFrameId,
      fixedFrameId,
      srcFrameId,
      dstTime,
      srcTime,
    ),
  );
  renderable.visible = poseApplied;
  if (poseApplied) {
    const p = tempPose.position;
    const q = tempPose.orientation;
    renderable.position.set(p.x, p.y, p.z);
    renderable.quaternion.set(q.x, q.y, q.z, q.w);
    renderable.updateMatrix();
  }
}

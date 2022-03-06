import * as THREE from "three";
import EventEmitter from "eventemitter3";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { Input, Size } from "./Input";
import { TF, Transform, TransformTree } from "./transforms";
import { makePose, Pose } from "./transforms/geometry";
import { mat4 } from "gl-matrix";

export type RendererEvents = {
  startFrame: (currentTime: bigint, renderer: Renderer) => void;
  endFrame: (currentTime: bigint, renderer: Renderer) => void;
  renderableSelected: (renderable: THREE.Object3D, renderer: Renderer) => void;
  transformTreeUpdated: (renderer: Renderer) => void;
};

const IDENTITY_POSE = makePose();

const tempTransform = new Transform([0, 0, 0], [0, 0, 0, 1]);

export class Renderer extends EventEmitter<RendererEvents> {
  canvas: HTMLCanvasElement;
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  input: Input;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  transformTree: TransformTree;
  currentTime: bigint | undefined;

  coordinateFrameRenderables = new Map<string, THREE.Object3D>();

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

    this.transformTree.addTransformMessage(tf);

    if (frameAdded) {
      console.info(`[Renderer] Added transform "${tf.header.frame_id}_T_${tf.child_frame_id}"`);
      this.emit("transformTreeUpdated", this);
    }
  }

  addCoordinateFrameRenderable(frameId: string): void {
    if (this.coordinateFrameRenderables.has(frameId)) return;

    const frame = new THREE.Object3D();
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
        const pose = renderable.userData.pose as Pose;
        const poseApplied = Boolean(
          this.transformTree.apply(
            pose,
            IDENTITY_POSE,
            renderFrameId,
            fixedFrameId,
            frameId,
            currentTime,
            currentTime,
          ),
        );
        renderable.visible = poseApplied;
        if (poseApplied) {
          tempTransform.setPose(pose);
          const p = tempTransform.position();
          const q = tempTransform.rotation();
          renderable.position.set(p[0], p[1], p[2]);
          renderable.quaternion.set(q[0], q[1], q[2], q[3]);
          renderable.updateMatrix();
        }
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

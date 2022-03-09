import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "../LineMaterial";
import { Renderer } from "../Renderer";
import { ColorRGBA, Marker, MarkerType, Pose } from "../ros";
import { makePose } from "../transforms/geometry";
import { rosTimeToNanoSec } from "../transforms/time";
import { updatePose } from "../updatePose";

type MarkerRenderable = THREE.Object3D & {
  userData: {
    topic?: string;
    marker?: Marker;
    srcTime?: bigint;
    pose?: Pose;
    mesh?: THREE.Mesh;
  };
};

type Material =
  | THREE.MeshBasicMaterial
  | THREE.MeshStandardMaterial
  | THREE.MeshToonMaterial
  | THREE.LineBasicMaterial
  | LineMaterial;

const tempVec = new THREE.Vector3();

export class Markers extends THREE.Object3D {
  renderer: Renderer;
  markerRenderables = new Map<string, MarkerRenderable>();
  boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);

  constructor(renderer: Renderer) {
    super();
    this.renderer = renderer;

    // Make the cylinder geometry stand upright
    this.cylinderGeometry.rotateX(Math.PI / 2);
  }

  addMarkerMessage(topic: string, marker: Marker): void {
    const markerId = getMarkerId(topic, marker.ns, marker.id);

    let renderable = this.markerRenderables.get(markerId);
    if (!renderable) {
      renderable = new THREE.Object3D() as MarkerRenderable;
      renderable.name = markerId;
      renderable.userData.topic = topic;
      renderable.userData.marker = marker;
      renderable.userData.srcTime = rosTimeToNanoSec(marker.header.stamp);
      renderable.userData.pose = makePose();

      this.add(renderable);
      this.markerRenderables.set(markerId, renderable);
    }

    this._updateMarkerRenderable(renderable, topic, marker);
  }

  removeMarkerMessage(topic: string, ns: string, id: number): void {
    const markerId = getMarkerId(topic, ns, id);
    const renderable = this.markerRenderables.get(markerId);
    if (renderable) {
      this.remove(renderable);
      this.markerRenderables.delete(markerId);
    }
  }

  markerWorldPosition(markerId: string): Readonly<THREE.Vector3> | undefined {
    const renderable = this.markerRenderables.get(markerId);
    if (!renderable) return undefined;

    tempVec.set(0, 0, 0);
    tempVec.applyMatrix4(renderable.matrixWorld);
    return tempVec;
  }

  startFrame(currentTime: bigint): void {
    const renderFrameId = this.renderer.renderFrameId;
    const fixedFrameId = this.renderer.fixedFrameId;
    if (!renderFrameId || !fixedFrameId) return;

    for (const renderable of this.markerRenderables.values()) {
      const marker = renderable.userData.marker!;
      const frameId = marker.header.frame_id;
      const srcTime = marker.frame_locked ? currentTime : renderable.userData.srcTime!;
      updatePose(
        renderable,
        this.renderer.transformTree,
        renderFrameId,
        fixedFrameId,
        frameId,
        currentTime,
        srcTime,
      );

      if (marker.text) {
        // FIXME: Track shown labels to avoid duplicate emits and to emit removeLabel
        const topic = renderable.userData.topic!;
        const markerId = getMarkerId(topic, marker.ns, marker.id);
        this.renderer.emit("showLabel", markerId, marker, this.renderer);
      }
    }
  }

  private _updateMarkerRenderable(
    renderable: MarkerRenderable,
    topic: string,
    marker: Marker,
  ): void {
    renderable.userData.topic = topic;
    renderable.userData.marker = marker;
    renderable.userData.pose = marker.pose;

    renderable.children.length = 0;

    switch (marker.type) {
      case MarkerType.CUBE:
        this._createCube(renderable, marker);
        break;
      case MarkerType.SPHERE:
        this._createSphere(renderable, marker);
        break;
      case MarkerType.CYLINDER:
        this._createCylinder(renderable, marker);
        break;
      case MarkerType.LINE_STRIP: {
        this._createLineStrip(renderable, marker);
        break;
      }
      case MarkerType.TEXT_VIEW_FACING:
        // Labels are created as <div> elements
        break;
      default:
        console.warn(`[Markers] Unsupported marker type: ${marker.type}`);
    }
  }

  private _createCube(output: MarkerRenderable, marker: Marker): void {
    const material = new THREE.MeshStandardMaterial({ dithering: true });
    setMaterialColor(material, marker.color);

    const cube = new THREE.Mesh(this.boxGeometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    const edges = new THREE.EdgesGeometry(this.boxGeometry, 40);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const line = new THREE.LineSegments(edges, lineMaterial);
    line.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    output.add(cube);
    output.add(line);
  }

  private _createSphere(output: MarkerRenderable, marker: Marker): void {
    const material = new THREE.MeshStandardMaterial({ dithering: true });
    setMaterialColor(material, marker.color);

    const sphere = new THREE.Mesh(this.sphereGeometry, material);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    const edges = new THREE.EdgesGeometry(this.sphereGeometry, 40);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const line = new THREE.LineSegments(edges, lineMaterial);
    line.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    output.add(sphere);
    output.add(line);
  }

  private _createCylinder(output: MarkerRenderable, marker: Marker): void {
    const material = new THREE.MeshStandardMaterial({ dithering: true });
    setMaterialColor(material, marker.color);
    const cylinder = new THREE.Mesh(this.cylinderGeometry, material);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    const edges = new THREE.EdgesGeometry(this.cylinderGeometry, 40);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const line = new THREE.LineSegments(edges, lineMaterial);
    line.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    output.add(cylinder);
    output.add(line);
  }

  private _createLineStrip(output: MarkerRenderable, marker: Marker): void {
    const linePositions = new Float32Array(marker.points.length * 3);
    for (let i = 0; i < marker.points.length; i++) {
      const point = marker.points[i]!;
      linePositions[i * 3 + 0] = point.x;
      linePositions[i * 3 + 1] = point.y;
      linePositions[i * 3 + 2] = point.z;
    }

    const geometry = new LineGeometry();
    geometry.setPositions(linePositions);
    setColorsFromLineStrip(geometry, marker);

    const material = new LineMaterial({
      color: 0x00ffff,
      worldUnits: true,
      vertexColors: true,
      resolution: this.renderer.input.canvasSize,
    });
    material.lineWidth = 0.1;
    setMaterialColor(material, marker.color);

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    output.add(line);
  }
}

function getMarkerId(topic: string, ns: string, id: number): string {
  return `${topic}:${ns ? ns + ":" : ""}${id}`.replace(/\s/g, "_");
}

function setMaterialColor(output: Material, color: Readonly<ColorRGBA>): void {
  const outputColor = output.color as THREE.Color;
  outputColor.setRGB(color.r, color.g, color.b);
  outputColor.convertSRGBToLinear();
  output.opacity = color.a;
  output.transparent = color.a < 1.0;
  output.depthTest = !output.transparent;
}

// This is a replacement for LineMaterial.setColors() that supports RGBA
function setColorsFromLineStrip(geometry: THREE.BufferGeometry, marker: Readonly<Marker>) {
  // Convert sRGB values to linear
  const linearColors: THREE.Vector4Tuple[] = [];
  for (let i = 0; i < marker.points.length; i++) {
    const srgb = marker.colors[i] ?? marker.color;
    const linear = new THREE.Color(srgb.r, srgb.g, srgb.b).convertSRGBToLinear();
    linearColors.push([linear.r, linear.g, linear.b, srgb.a]);
  }

  // Converts color-per-point to pairs format
  const length = linearColors.length - 1;
  const rgbaData = new Float32Array(8 * length);
  for (let i = 0; i < length; i++) {
    const color1 = linearColors[i]!;
    const color2 = linearColors[i + 1]!;

    rgbaData[8 * i + 0] = color1[0];
    rgbaData[8 * i + 1] = color1[1];
    rgbaData[8 * i + 2] = color1[2];
    rgbaData[8 * i + 3] = color1[3];

    rgbaData[8 * i + 4] = color2[0];
    rgbaData[8 * i + 5] = color2[1];
    rgbaData[8 * i + 6] = color2[2];
    rgbaData[8 * i + 7] = color2[3];
  }

  // [rgba, rgba]
  const instanceColorBuffer = new THREE.InstancedInterleavedBuffer(rgbaData, 8, 1);
  geometry.setAttribute(
    "instanceColorStart",
    new THREE.InterleavedBufferAttribute(instanceColorBuffer, 4, 0),
  );
  geometry.setAttribute(
    "instanceColorEnd",
    new THREE.InterleavedBufferAttribute(instanceColorBuffer, 4, 4),
  );
}

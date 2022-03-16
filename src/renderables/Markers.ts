import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { LineMaterial } from "../LineMaterial";
import {
  LineBasicColor,
  LineVertexColor,
  LineVertexColorPrepass,
  PointsVertexColor,
  StandardColor,
} from "../MaterialCache";
import { Renderer } from "../Renderer";
import { ColorRGBA, Marker, MarkerType, Pose, Vector3 } from "../ros";
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

type GltfMesh = THREE.Mesh<
  THREE.BufferGeometry,
  THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[]
>;

type Material =
  | THREE.MeshBasicMaterial
  | THREE.MeshStandardMaterial
  | THREE.MeshToonMaterial
  | THREE.LineBasicMaterial
  | LineMaterial
  | THREE.PointsMaterial;

const INVALID_CUBE_LIST = "INVALID_CUBE_LIST";
const INVALID_LINE_LIST = "INVALID_LINE_LIST";
const INVALID_LINE_STRIP = "INVALID_LINE_STRIP";
const INVALID_MARKER_TYPE = "INVALID_MARKER_TYPE";
const INVALID_POINTS_LIST = "INVALID_POINTS_LIST";
const INVALID_SPHERE_LIST = "INVALID_SPHERE_LIST";
const MESH_FETCH_FAILED = "MESH_FETCH_FAILED";

const OUTLINE_COLOR_DARK = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
const OUTLINE_COLOR_LIGHT = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };

const tempVec = new THREE.Vector3();
const tempColor = new THREE.Color();

export class Markers extends THREE.Object3D {
  renderer: Renderer;
  renderables = new Map<string, MarkerRenderable>();
  gltfMeshes = new Map<string, GLTF | false>();

  boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);

  boxEdges: THREE.EdgesGeometry;
  cylinderEdges: THREE.EdgesGeometry;

  constructor(renderer: Renderer) {
    super();
    this.renderer = renderer;

    // Make the cylinder geometry stand upright
    this.cylinderGeometry.rotateX(Math.PI / 2);

    this.boxEdges = new THREE.EdgesGeometry(this.boxGeometry, 40);
    this.cylinderEdges = new THREE.EdgesGeometry(this.cylinderGeometry, 40);
  }

  addMarkerMessage(topic: string, marker: Marker): void {
    const markerId = getMarkerId(topic, marker.ns, marker.id);

    let renderable = this.renderables.get(markerId);
    if (!renderable) {
      renderable = new THREE.Object3D() as MarkerRenderable;
      renderable.name = markerId;
      renderable.userData.topic = topic;
      renderable.userData.marker = marker;
      renderable.userData.srcTime = rosTimeToNanoSec(marker.header.stamp);
      renderable.userData.pose = makePose();

      this.add(renderable);
      this.renderables.set(markerId, renderable);
    }

    this._updateMarkerRenderable(renderable, topic, marker);
  }

  removeMarkerMessage(topic: string, ns: string, id: number): void {
    const markerId = getMarkerId(topic, ns, id);
    const renderable = this.renderables.get(markerId);
    if (renderable) {
      this.remove(renderable);
      this.renderables.delete(markerId);
    }
  }

  markerWorldPosition(markerId: string): Readonly<THREE.Vector3> | undefined {
    const renderable = this.renderables.get(markerId);
    if (!renderable) return undefined;

    tempVec.set(0, 0, 0);
    tempVec.applyMatrix4(renderable.matrixWorld);
    return tempVec;
  }

  startFrame(currentTime: bigint): void {
    const renderFrameId = this.renderer.renderFrameId;
    const fixedFrameId = this.renderer.fixedFrameId;
    if (!renderFrameId || !fixedFrameId) return;

    for (const renderable of this.renderables.values()) {
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

      // Set resolution uniform on all LineMaterials
      renderable.traverse((obj) => {
        const maybeMesh = obj as Partial<THREE.Mesh>;
        if (maybeMesh.material instanceof LineMaterial) {
          maybeMesh.material.resolution.copy(this.renderer.input.canvasSize);
        }
      });

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
      case MarkerType.LINE_STRIP:
        this._createLineStrip(renderable, topic, marker);
        break;
      case MarkerType.LINE_LIST:
        this._createLineList(renderable, topic, marker);
        break;
      case MarkerType.CUBE_LIST:
        this._createCubeList(renderable, topic, marker);
        break;
      case MarkerType.SPHERE_LIST:
        this._createSphereList(renderable, topic, marker);
        break;
      case MarkerType.POINTS:
        this._createPoints(renderable, topic, marker);
        break;
      case MarkerType.TEXT_VIEW_FACING:
        // Labels are created as <div> elements
        break;
      case MarkerType.MESH_RESOURCE:
        this._createMeshResource(renderable, topic, marker);
        break;
      case MarkerType.TRIANGLE_LIST:
        // TODO
        break;
      default:
        this.renderer.topicErrors.add(
          topic,
          INVALID_MARKER_TYPE,
          `Invalid marker type ${marker.type}`,
        );
    }
  }

  // Material creation

  private _getColorMaterial(color: ColorRGBA): THREE.MeshStandardMaterial {
    return this.renderer.materialCache.acquire(
      StandardColor.id(color),
      () => StandardColor.create(color),
      StandardColor.dispose,
    );
  }

  private _getOutlineMaterial(): THREE.LineBasicMaterial {
    const color = this.renderer.colorScheme === "dark" ? OUTLINE_COLOR_DARK : OUTLINE_COLOR_LIGHT;
    return this.renderer.materialCache.acquire(
      LineBasicColor.id(color),
      () => LineBasicColor.create(color),
      LineBasicColor.dispose,
    );
  }

  private _getPointsMaterial(scale: Vector3, transparent: boolean): THREE.PointsMaterial {
    return this.renderer.materialCache.acquire(
      PointsVertexColor.id(scale, transparent),
      () => PointsVertexColor.create(scale, transparent),
      PointsVertexColor.dispose,
    );
  }

  private _getLineMaterialPrepass(
    lineWidth: number,
    transparent: boolean,
    resolution: THREE.Vector2,
  ): LineMaterial {
    return this.renderer.materialCache.acquire(
      LineVertexColorPrepass.id(lineWidth, transparent),
      () => LineVertexColorPrepass.create(lineWidth, transparent, resolution),
      LineVertexColorPrepass.dispose,
    );
  }

  private _getLineMaterial(
    lineWidth: number,
    transparent: boolean,
    resolution: THREE.Vector2,
  ): LineMaterial {
    return this.renderer.materialCache.acquire(
      LineVertexColor.id(lineWidth, transparent),
      () => LineVertexColor.create(lineWidth, transparent, resolution),
      LineVertexColor.dispose,
    );
  }

  // Convert markers to renderable objects

  private _createCube(output: MarkerRenderable, marker: Marker): void {
    const material = this._getColorMaterial(marker.color);
    const cube = new THREE.Mesh(this.boxGeometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    const lineMaterial = this._getOutlineMaterial();
    const line = new THREE.LineSegments(this.boxEdges, lineMaterial);
    line.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    output.add(cube);
    output.add(line);
  }

  private _createSphere(output: MarkerRenderable, marker: Marker): void {
    const material = this._getColorMaterial(marker.color);
    const sphere = new THREE.Mesh(this.sphereGeometry, material);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    output.add(sphere);
  }

  private _createCylinder(output: MarkerRenderable, marker: Marker): void {
    const material = this._getColorMaterial(marker.color);
    const cylinder = new THREE.Mesh(this.cylinderGeometry, material);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    cylinder.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    const lineMaterial = this._getOutlineMaterial();
    const line = new THREE.LineSegments(this.cylinderEdges, lineMaterial);
    line.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

    output.add(cylinder);
    output.add(line);
  }

  private _createLineStrip(output: MarkerRenderable, topic: string, marker: Marker): void {
    if (marker.points.length < 2) {
      this.renderer.topicErrors.add(
        topic,
        INVALID_LINE_STRIP,
        "LINE_STRIP marker has fewer than 2 points",
      );
      return;
    }

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

    const lineWidth = marker.scale.x;
    const resolution = this.renderer.input.canvasSize;
    const transparent = hasTransparency(marker);

    // Stencil and depth pass 1
    const matLinePrepass = this._getLineMaterialPrepass(lineWidth, transparent, resolution);
    const linePrepass = new Line2(geometry, matLinePrepass);
    linePrepass.computeLineDistances();
    linePrepass.renderOrder = 1;
    output.add(linePrepass);

    // Color pass 2
    const matLine = this._getLineMaterial(lineWidth, transparent, resolution);
    const line = new Line2(geometry, matLine);
    line.computeLineDistances();
    line.renderOrder = 2;
    output.add(line);
  }

  private _createLineList(output: MarkerRenderable, topic: string, marker: Marker): void {
    if (marker.points.length < 2) {
      this.renderer.topicErrors.add(
        topic,
        INVALID_LINE_LIST,
        "LINE_LIST marker has fewer than 2 points",
      );
      return;
    } else if (marker.points.length % 2 !== 0) {
      this.renderer.topicErrors.add(
        topic,
        INVALID_LINE_LIST,
        "LINE_LIST marker has an odd number of points",
      );
      return;
    }

    const linePositions = new Float32Array(marker.points.length * 3);
    for (let i = 0; i < marker.points.length; i++) {
      const point = marker.points[i]!;
      linePositions[i * 3 + 0] = point.x;
      linePositions[i * 3 + 1] = point.y;
      linePositions[i * 3 + 2] = point.z;
    }

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(linePositions);
    setColorsFromLineList(geometry, marker);

    const lineWidth = marker.scale.x;
    const resolution = this.renderer.input.canvasSize;
    const transparent = hasTransparency(marker);

    // Stencil and depth pass 1
    const matLinePrepass = this._getLineMaterialPrepass(lineWidth, transparent, resolution);
    const linePrepass = new LineSegments2(geometry, matLinePrepass);
    linePrepass.computeLineDistances();
    linePrepass.renderOrder = 1;
    output.add(linePrepass);

    // Color pass 2
    const matLine = this._getLineMaterial(lineWidth, transparent, resolution);
    const line = new LineSegments2(geometry, matLine);
    line.computeLineDistances();
    line.renderOrder = 2;
    output.add(line);
  }

  private _createCubeList(output: MarkerRenderable, topic: string, marker: Marker): void {
    if (marker.points.length === 0) {
      this.renderer.topicErrors.add(topic, INVALID_CUBE_LIST, "CUBE_LIST marker has no points");
      return;
    }

    const lineMaterial = this._getOutlineMaterial();

    for (let i = 0; i < marker.points.length; i++) {
      const point = marker.points[i]!;
      const color = marker.colors[i] ?? marker.color;

      const material = this._getColorMaterial(color);
      const cube = new THREE.Mesh(this.boxGeometry, material);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.position.set(point.x, point.y, point.z);
      cube.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

      const line = new THREE.LineSegments(this.boxEdges, lineMaterial);
      line.position.set(point.x, point.y, point.z);
      line.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

      output.add(cube);
      output.add(line);
    }
  }

  private _createSphereList(output: MarkerRenderable, topic: string, marker: Marker): void {
    if (marker.points.length === 0) {
      this.renderer.topicErrors.add(topic, INVALID_SPHERE_LIST, "SPHERE_LIST marker has no points");
      return;
    }

    for (let i = 0; i < marker.points.length; i++) {
      const point = marker.points[i]!;
      const color = marker.colors[i] ?? marker.color;

      const material = this._getColorMaterial(color);
      const sphere = new THREE.Mesh(this.sphereGeometry, material);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      sphere.position.set(point.x, point.y, point.z);
      sphere.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

      output.add(sphere);
    }
  }

  private _createPoints(output: MarkerRenderable, topic: string, marker: Marker): void {
    if (marker.points.length === 0) {
      this.renderer.topicErrors.add(topic, INVALID_POINTS_LIST, "POINTS marker has no points");
      return;
    }

    // TODO: Support scale.x and scale.y
    // Look at https://threejs.org/examples/webgl_points_waves for an example of
    // how to pass custom attributes to a shader

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(marker.points.length * 3);
    for (let i = 0; i < marker.points.length; i++) {
      const point = marker.points[i]!;
      positions[i * 3 + 0] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const colors = new Float32Array(marker.points.length * 4);
    for (let i = 0; i < marker.points.length; i++) {
      const color = marker.colors[i] ?? marker.color;
      colors[i * 4 + 0] = color.r;
      colors[i * 4 + 1] = color.g;
      colors[i * 4 + 2] = color.b;
      colors[i * 4 + 3] = color.a;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 4));

    const material = this._getPointsMaterial(marker.scale, hasTransparency(marker));
    const points = new THREE.Points(geometry, material);
    output.add(points);
  }

  private async _createMeshResource(
    output: MarkerRenderable,
    topic: string,
    marker: Marker,
  ): Promise<void> {
    let gltf = this.gltfMeshes.get(marker.mesh_resource);
    if (gltf) {
      output.add(gltf.scene);
      return;
    } else if (gltf === false) {
      return;
    }

    try {
      gltf = await this.renderer.gltfLoader.loadAsync(marker.mesh_resource);
      this.gltfMeshes.set(marker.mesh_resource, gltf);

      // Y-up to Z-up
      gltf.scene.rotateX(Math.PI / 2);

      // Apply scaling
      gltf.scene.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);

      let material: THREE.MeshStandardMaterial | undefined;
      if (!marker.mesh_use_embedded_materials) {
        material = this._getColorMaterial(marker.color);
      }

      const edgesToAdd: [edges: THREE.LineSegments, parent: THREE.Object3D][] = [];
      const lineMaterial = this._getOutlineMaterial();

      gltf.scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        // Enable shadows for all meshes
        child.castShadow = true;
        child.receiveShadow = true;

        const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 40);
        const line = new THREE.LineSegments(edgesGeometry, lineMaterial);
        edgesToAdd.push([line, child]);

        if (!marker.mesh_use_embedded_materials) {
          // Dispose of any allocated textures and the material and swap it with
          // our own material
          const meshChild = child as GltfMesh;
          if (Array.isArray(meshChild.material)) {
            for (const material of meshChild.material) {
              StandardColor.dispose(material);
            }
          } else {
            StandardColor.dispose(meshChild.material);
          }
          meshChild.material = material!;
        }
      });

      output.add(gltf.scene);

      for (const [line, parent] of edgesToAdd) {
        parent.add(line);
      }
    } catch (ex) {
      this.renderer.topicErrors.add(
        topic,
        MESH_FETCH_FAILED,
        `Failed to fetch mesh_resource "${marker.mesh_resource}": ${(ex as Error).message}`,
      );
      this.gltfMeshes.set(marker.mesh_resource, false);
      return;
    }
  }
}

function getMarkerId(topic: string, ns: string, id: number): string {
  return `${topic}:${ns ? ns + ":" : ""}${id}`.replace(/\s/g, "_");
}

// This is a replacement for LineGeometry.setColors() that supports RGBA
function setColorsFromLineStrip(geometry: THREE.BufferGeometry, marker: Readonly<Marker>) {
  // Convert sRGB values to linear
  const linearColors = markerColorsToLinear(marker);

  // Converts color-per-point to pairs format in a flattened typed array
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

// This is a replacement for LineSegmentsGeometry.setColors() that supports RGBA
function setColorsFromLineList(geometry: THREE.BufferGeometry, marker: Readonly<Marker>) {
  // Convert sRGB values to linear
  const linearColors = markerColorsToLinear(marker);

  // Converts color-per-point to a flattened typed array
  const length = linearColors.length;
  const rgbaData = new Float32Array(4 * length);
  for (let i = 0; i < length; i++) {
    const color = linearColors[i]!;

    rgbaData[4 * i + 0] = color[0];
    rgbaData[4 * i + 1] = color[1];
    rgbaData[4 * i + 2] = color[2];
    rgbaData[4 * i + 3] = color[3];
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

function markerColorsToLinear(marker: Marker): THREE.Vector4Tuple[] {
  // Convert sRGB values to linear
  const linearColors: THREE.Vector4Tuple[] = [];
  for (let i = 0; i < marker.points.length; i++) {
    const srgb = marker.colors[i] ?? marker.color;
    tempColor.setRGB(srgb.r, srgb.g, srgb.b).convertSRGBToLinear();
    linearColors.push([tempColor.r, tempColor.g, tempColor.b, srgb.a]);
  }
  return linearColors;
}

function hasTransparency(marker: Marker): boolean {
  if (marker.colors.length > 0) {
    for (const color of marker.colors) {
      if (color.a < 1.0) {
        return true;
      }
    }
  }
  return marker.color.a < 1.0;
}

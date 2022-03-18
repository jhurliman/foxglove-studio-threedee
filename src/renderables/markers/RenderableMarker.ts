import * as THREE from "three";
import { Renderer } from "../../Renderer";
import { Marker, rosTimeToNanoSec } from "../../ros";
import { getMarkerId } from "./markerId";

const tempColor = new THREE.Color();
const tempTuple4: THREE.Vector4Tuple = [0, 0, 0, 0];

export class RenderableMarker extends THREE.Object3D {
  readonly topic: string;
  marker: Marker;
  srcTime: bigint;

  protected _renderer: Renderer;

  constructor(topic: string, marker: Marker, renderer: Renderer) {
    super();

    this._renderer = renderer;

    this.name = getMarkerId(topic, marker.ns, marker.id);
    this.topic = topic;
    this.marker = marker;
    this.srcTime = rosTimeToNanoSec(marker.header.stamp);
    this.userData.pose = marker.pose;

    renderer.renderables.set(this.name, this);
  }

  dispose(): void {
    this._renderer.renderables.delete(this.name);
  }

  update(marker: Marker): void {
    this.marker = marker;
    this.srcTime = rosTimeToNanoSec(marker.header.stamp);
    this.userData.pose = marker.pose;
  }

  // Convert sRGB values to linear
  protected _markerColorsToLinear(
    marker: Marker,
    callback: (color: THREE.Vector4Tuple, i: number) => void,
  ): void {
    const length = marker.points.length;
    for (let i = 0; i < length; i++) {
      const srgb = marker.colors[i] ?? marker.color;
      tempColor.setRGB(srgb.r, srgb.g, srgb.b).convertSRGBToLinear();
      tempTuple4[0] = tempColor.r;
      tempTuple4[1] = tempColor.g;
      tempTuple4[2] = tempColor.b;
      tempTuple4[3] = srgb.a;
      callback(tempTuple4, i);
    }
  }
}

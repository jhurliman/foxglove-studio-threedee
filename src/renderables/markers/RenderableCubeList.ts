import * as THREE from "three";
import { DynamicInstancedMesh } from "../../DynamicInstancedMesh";
import { Renderer } from "../../Renderer";
import { Marker } from "../../ros";
import {
  markerHasTransparency,
  releaseStandardInstancedMaterial,
  standardInstancedMaterial,
} from "./materials";
import { RenderableMarker } from "./RenderableMarker";

export class RenderableCubeList extends RenderableMarker {
  private static _geometry: THREE.BoxGeometry | undefined;
  private static _edgesGeometry: THREE.EdgesGeometry | undefined;

  mesh: DynamicInstancedMesh<THREE.BoxGeometry, THREE.Material>;
  // outline: THREE.LineSegments | undefined;

  constructor(topic: string, marker: Marker, renderer: Renderer) {
    super(topic, marker, renderer);

    // Cube instanced mesh
    const material = standardInstancedMaterial(marker, renderer.materialCache);
    this.mesh = new DynamicInstancedMesh(
      RenderableCubeList.geometry(),
      material,
      marker.points.length,
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

    // FIXME
    // Cube outlines
    // this.outline = new THREE.LineSegments(
    //   RenderableCubeList.edgesGeometry(),
    //   materialCache.outlineMaterial,
    // );
    // this.add(this.outline);

    this.update(marker);
  }

  override dispose(): void {
    releaseStandardInstancedMaterial(this.marker, this._renderer.materialCache);
  }

  override update(marker: Marker): void {
    super.update(marker);

    if (markerHasTransparency(marker) !== markerHasTransparency(this.marker)) {
      releaseStandardInstancedMaterial(marker, this._renderer.materialCache);
      this.mesh.material = standardInstancedMaterial(marker, this._renderer.materialCache);
    }

    this.mesh.set(marker.points, marker.scale, marker.colors, marker.color);
  }

  static geometry(): THREE.BoxGeometry {
    if (!RenderableCubeList._geometry) {
      RenderableCubeList._geometry = new THREE.BoxGeometry(1, 1, 1);
      RenderableCubeList._geometry.computeBoundingSphere();
    }
    return RenderableCubeList._geometry;
  }

  static edgesGeometry(): THREE.EdgesGeometry {
    if (!RenderableCubeList._edgesGeometry) {
      const geometry = RenderableCubeList.geometry();
      RenderableCubeList._edgesGeometry = new THREE.EdgesGeometry(geometry, 40);
      RenderableCubeList._edgesGeometry.computeBoundingSphere();
    }
    return RenderableCubeList._edgesGeometry;
  }
}

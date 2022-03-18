import * as THREE from "three";
import { DynamicInstancedMesh } from "../../DynamicInstancedMesh";
import { DetailLevel, Renderer } from "../../Renderer";
import { Marker } from "../../ros";
import {
  markerHasTransparency,
  releaseStandardInstancedMaterial,
  standardInstancedMaterial,
} from "./materials";
import { RenderableMarker } from "./RenderableMarker";

export class RenderableSphereList extends RenderableMarker {
  private static _lod: DetailLevel | undefined;
  private static _geometry: THREE.SphereGeometry | undefined;

  mesh: DynamicInstancedMesh<THREE.SphereGeometry, THREE.Material>;

  constructor(topic: string, marker: Marker, renderer: Renderer) {
    super(topic, marker, renderer);

    // Sphere instanced mesh
    const material = standardInstancedMaterial(marker, renderer.materialCache);
    this.mesh = new DynamicInstancedMesh(
      RenderableSphereList.geometry(renderer.lod),
      material,
      marker.points.length,
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

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

  static geometry(lod: DetailLevel): THREE.SphereGeometry {
    if (!RenderableSphereList._geometry || lod !== RenderableSphereList._lod) {
      const subdivisions = sphereSubdivisions(lod);
      RenderableSphereList._geometry = new THREE.SphereGeometry(0.5, subdivisions, subdivisions);
      RenderableSphereList._geometry.computeBoundingSphere();
      RenderableSphereList._lod = lod;
    }
    return RenderableSphereList._geometry;
  }
}

function sphereSubdivisions(lod: DetailLevel) {
  switch (lod) {
    case DetailLevel.Low:
      return 10;
    case DetailLevel.Medium:
      return 24;
    case DetailLevel.High:
      return 32;
  }
}

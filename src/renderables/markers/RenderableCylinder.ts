import * as THREE from "three";
import { rgbaEqual } from "../../color";
import { DetailLevel, Renderer } from "../../Renderer";
import { Marker } from "../../ros";
import { releaseStandardMaterial, standardMaterial } from "./materials";
import { RenderableMarker } from "./RenderableMarker";

export class RenderableCylinder extends RenderableMarker {
  private static _lod: DetailLevel | undefined;
  private static _geometry: THREE.CylinderGeometry | undefined;
  private static _edgesGeometry: THREE.EdgesGeometry | undefined;

  mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.Material>;
  outline: THREE.LineSegments | undefined;

  constructor(topic: string, marker: Marker, renderer: Renderer) {
    super(topic, marker, renderer);

    // Cylinder mesh
    const material = standardMaterial(marker, renderer.materialCache);
    this.mesh = new THREE.Mesh(RenderableCylinder.geometry(renderer.lod), material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

    // Cylinder outline
    this.outline = new THREE.LineSegments(
      RenderableCylinder.edgesGeometry(renderer.lod),
      renderer.materialCache.outlineMaterial,
    );
    this.mesh.add(this.outline);

    this.update(marker);
  }

  override dispose(): void {
    releaseStandardMaterial(this.marker, this._renderer.materialCache);
  }

  override update(marker: Marker): void {
    super.update(marker);

    if (!rgbaEqual(marker.color, this.marker.color)) {
      releaseStandardMaterial(marker, this._renderer.materialCache);
      this.mesh.material = standardMaterial(marker, this._renderer.materialCache);
    }

    this.scale.set(marker.scale.x, marker.scale.y, marker.scale.z);
  }

  static geometry(lod: DetailLevel): THREE.CylinderGeometry {
    if (!RenderableCylinder._geometry || lod !== RenderableCylinder._lod) {
      const subdivisions = cylinderSubdivisions(lod);
      RenderableCylinder._geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, subdivisions);
      RenderableCylinder._geometry.rotateX(Math.PI / 2); // Make the cylinder geometry stand upright
      RenderableCylinder._geometry.computeBoundingSphere();
      RenderableCylinder._lod = lod;
    }
    return RenderableCylinder._geometry;
  }

  static edgesGeometry(lod: DetailLevel): THREE.EdgesGeometry {
    if (!RenderableCylinder._edgesGeometry) {
      const geometry = RenderableCylinder.geometry(lod);
      RenderableCylinder._edgesGeometry = new THREE.EdgesGeometry(geometry, 40);
      RenderableCylinder._edgesGeometry.computeBoundingSphere();
    }
    return RenderableCylinder._edgesGeometry;
  }
}

function cylinderSubdivisions(lod: DetailLevel) {
  switch (lod) {
    case DetailLevel.Low:
      return 12;
    case DetailLevel.Medium:
      return 20;
    case DetailLevel.High:
      return 32;
  }
}

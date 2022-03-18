import * as THREE from "three";
import { rgbaEqual } from "../../color";
import { Renderer } from "../../Renderer";
import { Marker } from "../../ros";
import { releaseStandardMaterial, standardMaterial } from "./materials";
import { RenderableMarker } from "./RenderableMarker";

export class RenderableCube extends RenderableMarker {
  private static _geometry: THREE.BoxGeometry | undefined;
  private static _edgesGeometry: THREE.EdgesGeometry | undefined;

  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.Material>;
  outline: THREE.LineSegments | undefined;

  constructor(topic: string, marker: Marker, renderer: Renderer) {
    super(topic, marker, renderer);

    // Cube mesh
    this.mesh = new THREE.Mesh(
      RenderableCube.geometry(),
      standardMaterial(marker, renderer.materialCache),
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

    // Cube outline
    this.outline = new THREE.LineSegments(
      RenderableCube.edgesGeometry(),
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

  static geometry(): THREE.BoxGeometry {
    if (!RenderableCube._geometry) {
      RenderableCube._geometry = new THREE.BoxGeometry(1, 1, 1);
      RenderableCube._geometry.computeBoundingSphere();
    }
    return RenderableCube._geometry;
  }

  static edgesGeometry(): THREE.EdgesGeometry {
    if (!RenderableCube._edgesGeometry) {
      RenderableCube._edgesGeometry = new THREE.EdgesGeometry(RenderableCube.geometry(), 40);
      RenderableCube._edgesGeometry.computeBoundingSphere();
    }
    return RenderableCube._edgesGeometry;
  }
}

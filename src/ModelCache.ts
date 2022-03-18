import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export type LoadModelOptions = {
  ignoreColladaUpAxis?: boolean;
};

export class ModelCache {
  private _gltfLoader = new GLTFLoader();
  private _models = new Map<string, Promise<GLTF | undefined>>();

  constructor(private loadModelOptions: LoadModelOptions) {}

  async load(url: string, reportError: (_: Error) => void): Promise<GLTF | undefined> {
    let promise = this._models.get(url);
    if (promise) return await promise;

    promise = this._loadModel(url, this.loadModelOptions).catch(async (err) => {
      reportError(err as Error);
      return Promise.resolve(undefined);
    });
    this._models.set(url, promise);
    return await promise;
  }

  private async _loadModel(url: string, _options: LoadModelOptions): Promise<GLTF | undefined> {
    // TODO: Support other model formats
    const gltf = await this._gltfLoader.loadAsync(url);

    // Y-up to Z-up
    gltf.scene.rotateX(Math.PI / 2);

    return gltf;
  }
}

import * as THREE from "three";

interface TypedArray {
  readonly length: number;
  readonly [n: number]: number;
  BYTES_PER_ELEMENT: number;
  set(n: ArrayLike<number>, offset: number): void;
}

interface TypedArrayConstructor<T extends TypedArray> {
  new (length: number): T;
}

export class DynamicBufferAttribute<
  T extends TypedArray,
  C extends TypedArrayConstructor<T>,
> extends THREE.BufferAttribute {
  private _dataConstructor: C;
  // Total number of items that can be stored in this buffer attribute, which
  // can be larger than .count
  private _itemCapacity: number;

  constructor(arrayConstructor: C, itemSize: number, normalized?: boolean) {
    super(new arrayConstructor(0), itemSize, normalized);
    this._dataConstructor = arrayConstructor;
    this._itemCapacity = 0;

    this.setUsage(THREE.DynamicDrawUsage);
  }

  get data(): T {
    return this.array as T;
  }

  resize(itemCount: number) {
    this.count = itemCount;
    if (itemCount <= this._itemCapacity) return;
    this.array = new this._dataConstructor(itemCount * this.itemSize);
    this._itemCapacity = itemCount;
  }
}

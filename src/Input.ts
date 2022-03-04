import EventEmitter from "eventemitter3";
import * as THREE from "three";
import { Key } from "ts-key-enum";

const MAX_DIST = 1;

export type Size = { width: number; height: number };

export type InputEvents = {
  resize: (windowSize: Size, event: UIEvent) => void;
  click: (cursorCoords: THREE.Vector2, event: MouseEvent) => void;
  mousedown: (cursorCoords: THREE.Vector2, event: MouseEvent) => void;
  mousemove: (cursorCoords: THREE.Vector2, event: MouseEvent) => void;
  keydown: (key: Key, event: KeyboardEvent) => void;
};

export class Input extends EventEmitter<InputEvents> {
  readonly canvas: HTMLCanvasElement;
  canvasSize: { width: number; height: number };
  startClientPos?: THREE.Vector2; // clientX / clientY
  cursorCoords = new THREE.Vector2(); // Normalized device coordinates (-1 to +1)

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.canvasSize = { width: canvas.width, height: canvas.height };

    window.addEventListener("resize", this.onWindowResize, false);
    document.addEventListener("keydown", this.onKeyDown, false);
    canvas.addEventListener("mousedown", this.onMouseDown, false);
    canvas.addEventListener("mousemove", this.onMouseMove, false);
    canvas.addEventListener("click", this.onClick, false);
    canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    canvas.addEventListener("touchend", this.onTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    canvas.addEventListener("touchcancel", this.onTouchCancel, { passive: false });
    canvas.addEventListener("touchendoutside", this.onTouchEndOutside);
  }

  onWindowResize = (event: UIEvent): void => {
    if (this.canvas.parentElement) {
      this.canvasSize.width = this.canvas.parentElement.clientWidth;
      this.canvasSize.height = this.canvas.parentElement.clientHeight;
      this.emit("resize", this.canvasSize, event);
    }
  };

  onKeyDown = (event: KeyboardEvent): void => {
    this.emit("keydown", event.key as Key, event);
  };

  onMouseDown = (event: MouseEvent): void => {
    this.startClientPos = new THREE.Vector2(event.clientX, event.clientY);
    this.emit("mousedown", this.cursorCoords, event);
  };

  onMouseMove = (event: MouseEvent): void => {
    this.updateCursorCoords(event);
    this.emit("mousemove", this.cursorCoords, event);
  };

  onClick = (event: MouseEvent): void => {
    if (!this.startClientPos) {
      return;
    }

    const newPos = new THREE.Vector2(event.clientX, event.clientY);
    const dist = this.startClientPos.distanceTo(newPos);
    this.startClientPos = undefined;

    if (dist > MAX_DIST) {
      return;
    }

    this.updateCursorCoords(event);
    this.emit("click", this.cursorCoords, event);
  };

  onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (touch) {
      this.startClientPos = new THREE.Vector2(touch.clientX, touch.clientY);
    }
    event.preventDefault();
  };

  onTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
  };

  onTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
  };

  onTouchCancel = (event: TouchEvent): void => {
    event.preventDefault();
  };

  onTouchEndOutside = (): void => {
    //
  };

  private updateCursorCoords(event: MouseEvent): void {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    this.cursorCoords.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.cursorCoords.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
}

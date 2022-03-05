import { Duration, Time } from "./time";
import { Orientation, Point, Pose } from "./geometry";
import { CoordinateFrame } from "./CoordinateFrame";
import { Transform } from "./Transform";

export type TF = {
  header: {
    frame_id: string;
    stamp: { sec: number; nsec: number };
    seq: number;
  };
  child_frame_id: string;
  transform: {
    rotation: Orientation;
    translation: Point;
  };
};

/**
 * TransformTree is a collection of coordinate frames with convenience methods
 * for getting and creating frames and adding transforms between frames.
 */
export class TransformTree {
  private _frames = new Map<string, CoordinateFrame>();

  addTransform(frameId: string, parentFrameId: string, time: Time, transform: Transform): void {
    const frame = this.getOrCreateFrame(frameId);
    const curParentFrame = frame.parent();
    if (curParentFrame == undefined || curParentFrame.id !== parentFrameId) {
      // This frame was previously unparented but now we know its parent, or we
      // are reparenting this frame
      frame.setParent(this.getOrCreateFrame(parentFrameId));
    }

    frame.addTransform(time, transform);
  }

  addTransformMessage(tf: TF): void {
    const stamp = BigInt(tf.header.stamp.sec) * BigInt(1e9) + BigInt(tf.header.stamp.nsec);
    const t = tf.transform.translation;
    const q = tf.transform.rotation;
    const transform = new Transform([t.x, t.y, t.z], [q.x, q.y, q.z, q.w]);
    this.addTransform(tf.child_frame_id, tf.header.frame_id, stamp, transform);
  }

  hasFrame(id: string): boolean {
    return this._frames.has(id);
  }

  frame(id: string): CoordinateFrame | undefined {
    return this._frames.get(id);
  }

  getOrCreateFrame(id: string): CoordinateFrame {
    let frame = this._frames.get(id);
    if (!frame) {
      frame = new CoordinateFrame(id, undefined);
      this._frames.set(id, frame);
    }
    return frame;
  }

  frames(): ReadonlyMap<string, CoordinateFrame> {
    return this._frames;
  }

  apply(
    output: Pose,
    input: Readonly<Pose>,
    frameId: string,
    rootFrameId: string | undefined,
    srcFrameId: string,
    dstTime: Time,
    srcTime: Time,
    maxDelta?: Duration,
  ): Pose | undefined {
    const frame = this.frame(frameId);
    const srcFrame = this.frame(srcFrameId);
    if (!frame || !srcFrame) {
      return undefined;
    }
    const rootFrame =
      (rootFrameId != undefined ? this.frame(rootFrameId) : frame.root()) ?? frame.root();
    return frame.apply(output, input, rootFrame, srcFrame, dstTime, srcTime, maxDelta);
  }

  static Clone(tree: TransformTree): TransformTree {
    const newTree = new TransformTree();
    // eslint-disable-next-line no-underscore-dangle
    newTree._frames = tree._frames;
    return newTree;
  }
}

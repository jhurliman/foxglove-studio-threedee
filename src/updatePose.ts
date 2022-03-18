import { makePose, Pose, TransformTree } from "./transforms";

const tempPose = makePose();

export function updatePose(
  renderable: THREE.Object3D,
  transformTree: TransformTree,
  renderFrameId: string,
  fixedFrameId: string,
  srcFrameId: string,
  dstTime: bigint,
  srcTime: bigint,
): void {
  const pose = renderable.userData.pose as Pose | undefined;
  if (!pose) throw new Error(`Missing userData.pose for ${renderable.name}`);
  const poseApplied = Boolean(
    transformTree.apply(tempPose, pose, renderFrameId, fixedFrameId, srcFrameId, dstTime, srcTime),
  );
  renderable.visible = poseApplied;
  if (poseApplied) {
    const p = tempPose.position;
    const q = tempPose.orientation;
    renderable.position.set(p.x, p.y, p.z);
    renderable.quaternion.set(q.x, q.y, q.z, q.w);
    renderable.updateMatrix();
  }
}

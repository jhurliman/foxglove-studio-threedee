import * as THREE from "three";
import { Renderer } from "../Renderer";
import { Marker } from "../ros";
import { TopicMarkers } from "./TopicMarkers";

export class Markers extends THREE.Object3D {
  renderer: Renderer;
  topics = new Map<string, TopicMarkers>();

  constructor(renderer: Renderer) {
    super();
    this.renderer = renderer;
  }

  dispose(): void {
    for (const topicMarker of this.topics.values()) {
      topicMarker.dispose();
    }
    this.topics.clear();
  }

  addMarkerMessage(topic: string, marker: Marker): void {
    let topicMarkers = this.topics.get(topic);
    if (!topicMarkers) {
      topicMarkers = new TopicMarkers(topic, this.renderer);
      this.topics.set(topic, topicMarkers);
      this.add(topicMarkers);
    }
    topicMarkers.addMarkerMessage(marker);
  }

  startFrame(currentTime: bigint): void {
    const renderFrameId = this.renderer.renderFrameId;
    const fixedFrameId = this.renderer.fixedFrameId;
    if (!renderFrameId || !fixedFrameId) return;

    for (const topicMarker of this.topics.values()) {
      topicMarker.startFrame(currentTime, renderFrameId, fixedFrameId);
    }
  }
}

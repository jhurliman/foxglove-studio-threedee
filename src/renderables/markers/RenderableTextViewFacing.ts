function getMarkerId(topic: string, ns: string, id: number): string {
  return `${topic}:${ns ? ns + ":" : ""}${id}`.replace(/\s/g, "_");
}

//   if (marker.text) {
//     // FIXME: Track shown labels to avoid duplicate emits and to emit removeLabel
//     const topic = renderable.userData.topic!;
//     const markerId = getMarkerId(topic, marker.ns, marker.id);
//     this.renderer.emit("showLabel", markerId, marker, this.renderer);
//   }

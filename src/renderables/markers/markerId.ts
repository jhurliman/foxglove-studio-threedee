export function getMarkerId(topic: string, ns: string, id: number): string {
  return `${topic}:${ns ? ns + ":" : ""}${id}`.replace(/\s/g, "_");
}

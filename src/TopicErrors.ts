
export class TopicErrors {
  errors = new Map<string, Map<string, string>>(); // topic -> {errorId -> errorMessage}

  add(topic: string, errorId: string, errorMessage: string): void {
    let topicErrors = this.errors.get(topic);
    if (!topicErrors) {
      topicErrors = new Map();
      this.errors.set(topic, topicErrors);
    }
    topicErrors.set(errorId, errorMessage);
    console.warn(`[TopicError][${topic}] ${errorId}: ${errorMessage}`);
  }

  remove(topic: string, errorId: string): void {
    const topicErrors = this.errors.get(topic);
    if (topicErrors) {
      topicErrors.delete(errorId);
    }
  }

  clearTopic(topic: string): void {
    this.errors.delete(topic);
  }

  clear(): void {
    this.errors.clear();
  }
}

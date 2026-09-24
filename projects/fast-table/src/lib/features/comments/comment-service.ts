import { Injectable, signal } from '@angular/core';

@Injectable()
export class CommentService {
  private readonly comments = signal<Map<string, string>>(new Map());

  private key(nodeId: string, colId: string): string {
    return `${nodeId}:${colId}`;
  }

  getComment(nodeId: string, colId: string): string | undefined {
    return this.comments().get(this.key(nodeId, colId));
  }

  hasComment(nodeId: string, colId: string): boolean {
    return this.comments().has(this.key(nodeId, colId));
  }

  setComment(nodeId: string, colId: string, text: string): void {
    const next = new Map(this.comments());
    if (text.trim() === '') next.delete(this.key(nodeId, colId));
    else next.set(this.key(nodeId, colId), text);
    this.comments.set(next);
  }

  readonly version = this.comments;
}

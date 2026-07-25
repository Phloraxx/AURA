/**
 * Tracks the newest asynchronous operation in a single UI flow.
 *
 * Slow model responses must never overwrite a more recent request. Starting a
 * new operation invalidates every token returned previously.
 */
export class LatestOperation {
  private generation = 0;

  begin(): number {
    this.generation += 1;
    return this.generation;
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }
}

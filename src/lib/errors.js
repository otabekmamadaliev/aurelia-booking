/**
 * Errors the UI is expected to show a guest verbatim.
 *
 * Shared by both backends so callers can catch one type regardless of whether
 * the refusal came from a `Math.min` in this browser or from a `raise
 * exception` inside a Postgres transaction. The message is written to be read
 * by the person who just pressed Confirm, not by a developer.
 */
export class UnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnavailableError'
  }
}

/**
 * A random id that is unique across phones (needed once data is shared). Older records keep
 * their shorter ids; both are plain strings, so never parse an id.
 */
export const uid = (): string =>
  crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);

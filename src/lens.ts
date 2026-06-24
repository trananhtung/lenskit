/**
 * Lens<S, A> — a bidirectional getter/setter pair for a field of type A within S.
 * Inspired by Haskell van Laarhoven lenses, Scala Monocle, Kotlin Arrow optics.
 *
 * - get(s)         → read the focus
 * - set(s, a)      → write (returns new S, never mutates)
 * - modify(s, fn)  → update via function
 * - compose(other) → compose two lenses, focusing deeper
 */
export interface Lens<S, A> {
  get(s: S): A;
  set(s: S, a: A): S;
  modify(s: S, fn: (a: A) => A): S;
  compose<B>(other: Lens<A, B>): Lens<S, B>;
  composePrism<B>(other: Prism<A, B>): Optional<S, B>;
  composeOptional<B>(other: Optional<A, B>): Optional<S, B>;
}

/**
 * Prism<S, A> — a getter that may fail (like matching a union discriminant).
 * get returns A | undefined; set replaces the full S.
 */
export interface Prism<S, A> {
  get(s: S): A | undefined;
  set(s: S, a: A): S;
  modify(s: S, fn: (a: A) => A): S;
  compose<B>(other: Prism<A, B>): Prism<S, B>;
  composeLens<B>(other: Lens<A, B>): Optional<S, B>;
}

/**
 * Optional<S, A> — a focus that may not exist (combination of Lens + Prism).
 * Like a Lens with a possibly-absent target: Scala Option lens.
 */
export interface Optional<S, A> {
  get(s: S): A | undefined;
  set(s: S, a: A): S;
  modify(s: S, fn: (a: A) => A): S;
  modifyOption(s: S, fn: (a: A) => A): S; // no-op if absent
  compose<B>(other: Optional<A, B>): Optional<S, B>;
  composeLens<B>(other: Lens<A, B>): Optional<S, B>;
  composePrism<B>(other: Prism<A, B>): Optional<S, B>;
}

// ── Lens implementation ────────────────────────────────────────────────────

class LensImpl<S, A> implements Lens<S, A> {
  constructor(
    private readonly _get: (s: S) => A,
    private readonly _set: (s: S, a: A) => S
  ) {}

  get(s: S): A { return this._get(s); }
  set(s: S, a: A): S { return this._set(s, a); }
  modify(s: S, fn: (a: A) => A): S { return this._set(s, fn(this._get(s))); }

  compose<B>(other: Lens<A, B>): Lens<S, B> {
    return lens(
      s => other.get(this._get(s)),
      (s, b) => this._set(s, other.set(this._get(s), b))
    );
  }

  composePrism<B>(other: Prism<A, B>): Optional<S, B> {
    return optional(
      s => other.get(this._get(s)),
      (s, b) => this._set(s, other.set(this._get(s), b))
    );
  }

  composeOptional<B>(other: Optional<A, B>): Optional<S, B> {
    return optional(
      s => other.get(this._get(s)),
      (s, b) => this._set(s, other.set(this._get(s), b))
    );
  }
}

// ── Prism implementation ───────────────────────────────────────────────────

class PrismImpl<S, A> implements Prism<S, A> {
  constructor(
    private readonly _get: (s: S) => A | undefined,
    private readonly _set: (s: S, a: A) => S
  ) {}

  get(s: S): A | undefined { return this._get(s); }
  set(s: S, a: A): S { return this._set(s, a); }
  modify(s: S, fn: (a: A) => A): S {
    const a = this._get(s);
    return a !== undefined ? this._set(s, fn(a)) : s;
  }

  compose<B>(other: Prism<A, B>): Prism<S, B> {
    return prism(
      s => {
        const a = this._get(s);
        return a !== undefined ? other.get(a) : undefined;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== undefined ? this._set(s, other.set(a, b)) : s;
      }
    );
  }

  composeLens<B>(other: Lens<A, B>): Optional<S, B> {
    return optional(
      s => {
        const a = this._get(s);
        return a !== undefined ? other.get(a) : undefined;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== undefined ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
}

// ── Optional implementation ────────────────────────────────────────────────

class OptionalImpl<S, A> implements Optional<S, A> {
  constructor(
    private readonly _get: (s: S) => A | undefined,
    private readonly _set: (s: S, a: A) => S
  ) {}

  get(s: S): A | undefined { return this._get(s); }
  set(s: S, a: A): S { return this._set(s, a); }
  modify(s: S, fn: (a: A) => A): S {
    const a = this._get(s);
    return a !== undefined ? this._set(s, fn(a)) : s;
  }
  modifyOption(s: S, fn: (a: A) => A): S {
    return this.modify(s, fn);
  }

  compose<B>(other: Optional<A, B>): Optional<S, B> {
    return optional(
      s => {
        const a = this._get(s);
        return a !== undefined ? other.get(a) : undefined;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== undefined ? this._set(s, other.set(a, b)) : s;
      }
    );
  }

  composeLens<B>(other: Lens<A, B>): Optional<S, B> {
    return optional(
      s => {
        const a = this._get(s);
        return a !== undefined ? other.get(a) : undefined;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== undefined ? this._set(s, other.set(a, b)) : s;
      }
    );
  }

  composePrism<B>(other: Prism<A, B>): Optional<S, B> {
    return optional(
      s => {
        const a = this._get(s);
        return a !== undefined ? other.get(a) : undefined;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== undefined ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
}

// ── Factories ──────────────────────────────────────────────────────────────

/** Create a Lens from explicit getter and immutable setter. */
export function lens<S, A>(get: (s: S) => A, set: (s: S, a: A) => S): Lens<S, A> {
  return new LensImpl(get, set);
}

/** Create a Prism from a partial getter (returns undefined on mismatch) and setter. */
export function prism<S, A>(get: (s: S) => A | undefined, set: (s: S, a: A) => S): Prism<S, A> {
  return new PrismImpl(get, set);
}

/** Create an Optional (Lens+Prism) from a partial getter and setter. */
export function optional<S, A>(get: (s: S) => A | undefined, set: (s: S, a: A) => S): Optional<S, A> {
  return new OptionalImpl(get, set);
}

// ── Key lens (property access on objects) ──────────────────────────────────

/**
 * Create a Lens for a property key on an object.
 * The setter uses spread — does NOT mutate the original.
 *
 * @example
 * const nameLens = prop<User, 'name'>('name');
 * nameLens.get({ name: 'Alice' });       // "Alice"
 * nameLens.set({ name: 'Alice' }, 'Bob'); // { name: 'Bob' }
 */
export function prop<S extends object, K extends keyof S>(key: K): Lens<S, S[K]> {
  return lens(
    s => s[key],
    (s, a) => ({ ...s, [key]: a })
  );
}

/**
 * Create a Lens for an index in a readonly array.
 * set() replaces the element at that index; does NOT mutate.
 */
export function index<A>(i: number): Optional<ReadonlyArray<A>, A> {
  return optional(
    arr => arr[i],
    (arr, a) => {
      const copy = [...arr] as A[];
      copy[i] = a;
      return copy;
    }
  );
}

/**
 * Create an Optional for an array element matching a predicate (first match).
 */
export function find<A>(predicate: (a: A) => boolean): Optional<ReadonlyArray<A>, A> {
  return optional(
    arr => arr.find(predicate),
    (arr, a) => {
      const i = arr.findIndex(predicate);
      if (i === -1) return arr;
      const copy = [...arr] as A[];
      copy[i] = a;
      return copy;
    }
  );
}

// ── Traversal ─────────────────────────────────────────────────────────────

/**
 * Traversal<S, A> — focuses on zero or more A values inside S.
 * Like a Lens that works on every element of a collection.
 */
export interface Traversal<S, A> {
  getAll(s: S): A[];
  modify(s: S, fn: (a: A) => A): S;
  set(s: S, a: A): S;
  compose<B>(other: Traversal<A, B>): Traversal<S, B>;
}

class TraversalImpl<S, A> implements Traversal<S, A> {
  constructor(
    private readonly _getAll: (s: S) => A[],
    private readonly _modify: (s: S, fn: (a: A) => A) => S
  ) {}

  getAll(s: S): A[] { return this._getAll(s); }
  modify(s: S, fn: (a: A) => A): S { return this._modify(s, fn); }
  set(s: S, a: A): S { return this._modify(s, () => a); }

  compose<B>(other: Traversal<A, B>): Traversal<S, B> {
    return traversal(
      s => this._getAll(s).flatMap(a => other.getAll(a)),
      (s, fn) => this._modify(s, a => other.modify(a, fn))
    );
  }
}

export function traversal<S, A>(
  getAll: (s: S) => A[],
  modify: (s: S, fn: (a: A) => A) => S
): Traversal<S, A> {
  return new TraversalImpl(getAll, modify);
}

/** Traversal over all elements of an array. */
export function each<A>(): Traversal<A[], A> {
  return traversal(
    arr => [...arr],
    (arr, fn) => arr.map(fn)
  );
}

/** Traversal over all values of a Record. */
export function values<K extends string, A>(): Traversal<Record<K, A>, A> {
  return traversal(
    obj => Object.values(obj) as A[],
    (obj, fn) => {
      const result = {} as Record<K, A>;
      for (const k of Object.keys(obj) as K[]) result[k] = fn((obj as Record<K, A>)[k]);
      return result;
    }
  );
}

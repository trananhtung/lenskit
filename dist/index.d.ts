/**
 * Lens<S, A> — a bidirectional getter/setter pair for a field of type A within S.
 * Inspired by Haskell van Laarhoven lenses, Scala Monocle, Kotlin Arrow optics.
 *
 * - get(s)         → read the focus
 * - set(s, a)      → write (returns new S, never mutates)
 * - modify(s, fn)  → update via function
 * - compose(other) → compose two lenses, focusing deeper
 */
interface Lens<S, A> {
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
interface Prism<S, A> {
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
interface Optional<S, A> {
    get(s: S): A | undefined;
    set(s: S, a: A): S;
    modify(s: S, fn: (a: A) => A): S;
    modifyOption(s: S, fn: (a: A) => A): S;
    compose<B>(other: Optional<A, B>): Optional<S, B>;
    composeLens<B>(other: Lens<A, B>): Optional<S, B>;
    composePrism<B>(other: Prism<A, B>): Optional<S, B>;
}
/** Create a Lens from explicit getter and immutable setter. */
declare function lens<S, A>(get: (s: S) => A, set: (s: S, a: A) => S): Lens<S, A>;
/** Create a Prism from a partial getter (returns undefined on mismatch) and setter. */
declare function prism<S, A>(get: (s: S) => A | undefined, set: (s: S, a: A) => S): Prism<S, A>;
/** Create an Optional (Lens+Prism) from a partial getter and setter. */
declare function optional<S, A>(get: (s: S) => A | undefined, set: (s: S, a: A) => S): Optional<S, A>;
/**
 * Create a Lens for a property key on an object.
 * The setter uses spread — does NOT mutate the original.
 *
 * @example
 * const nameLens = prop<User, 'name'>('name');
 * nameLens.get({ name: 'Alice' });       // "Alice"
 * nameLens.set({ name: 'Alice' }, 'Bob'); // { name: 'Bob' }
 */
declare function prop<S extends object, K extends keyof S>(key: K): Lens<S, S[K]>;
/**
 * Create an Optional for an element at index i in an array.
 * set() replaces the element at that index; does NOT mutate.
 */
declare function index<A>(i: number): Optional<A[], A>;
/**
 * Create an Optional for an array element matching a predicate (first match).
 */
declare function find<A>(predicate: (a: A) => boolean): Optional<A[], A>;
/**
 * Traversal<S, A> — focuses on zero or more A values inside S.
 * Like a Lens that works on every element of a collection.
 */
interface Traversal<S, A> {
    getAll(s: S): A[];
    modify(s: S, fn: (a: A) => A): S;
    set(s: S, a: A): S;
    compose<B>(other: Traversal<A, B>): Traversal<S, B>;
}
declare function traversal<S, A>(getAll: (s: S) => A[], modify: (s: S, fn: (a: A) => A) => S): Traversal<S, A>;
/** Traversal over all elements of an array. */
declare function each<A>(): Traversal<A[], A>;
/** Traversal over all values of a Record. */
declare function values<K extends string, A>(): Traversal<Record<K, A>, A>;

export { type Lens, type Optional, type Prism, type Traversal, each, find, index, lens, optional, prism, prop, traversal, values };

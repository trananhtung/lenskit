# lenskit

Zero-dependency TypeScript functional optics: `Lens`, `Prism`, `Optional`, and `Traversal` for immutable deep updates. Simpler than monocle-ts, no category-theory overhead.

Port of Haskell/Scala Monocle, Kotlin Arrow optics, and Swift Composable Architecture's `Binding`.

[![npm](https://img.shields.io/npm/v/lenskit)](https://www.npmjs.com/package/lenskit)
[![license](https://img.shields.io/npm/l/lenskit)](LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)

## Install

```bash
npm install lenskit
```

## Why optics?

Immutably updating nested data in TypeScript is verbose:

```typescript
// Without lenses:
const updated = {
  ...state,
  users: state.users.map((u, i) =>
    i === 0 ? { ...u, address: { ...u.address, city: "Boston" } } : u
  )
};

// With lenskit:
const updated = usersLens
  .composeOptional(index(0))
  .compose(addressLens)
  .compose(cityLens)
  .set(state, "Boston");
```

## Core concepts

| Type | When to use | get() returns |
|---|---|---|
| `Lens<S, A>` | Field always exists | `A` |
| `Prism<S, A>` | Match a union variant | `A \| undefined` |
| `Optional<S, A>` | Field may be absent | `A \| undefined` |
| `Traversal<S, A>` | Multiple targets (array elements) | `A[]` |

## API

### `prop<S, K>(key)` — Lens for an object property

```typescript
import { prop } from "lenskit";

const ageLens = prop<User, "age">("age");
ageLens.get(user);            // number
ageLens.set(user, 31);        // new User with age=31
ageLens.modify(user, n => n + 1);  // increment
```

### `lens(get, set)` — Custom Lens

```typescript
import { lens } from "lenskit";

const fullNameLens = lens<User, string>(
  u => `${u.firstName} ${u.lastName}`,
  (u, full) => {
    const [first, ...rest] = full.split(" ");
    return { ...u, firstName: first, lastName: rest.join(" ") };
  }
);
```

### `prism(get, set)` — Partial get (union discriminants)

```typescript
import { prism } from "lenskit";

type Shape = { type: "circle"; radius: number } | { type: "square"; side: number };

const radiusPrism = prism<Shape, number>(
  s => s.type === "circle" ? s.radius : undefined,
  (s, r) => ({ ...s, type: "circle", radius: r } as Shape)
);

radiusPrism.get({ type: "circle", radius: 5 });  // 5
radiusPrism.get({ type: "square", side: 3 });    // undefined
radiusPrism.modify(circle, r => r * 2);          // doubles radius
radiusPrism.modify(square, r => r * 2);          // no-op (square has no radius)
```

### `optional(get, set)` — Optional field

```typescript
import { optional } from "lenskit";

const timeoutOpt = optional<Config, number>(
  c => c.timeout,
  (c, t) => ({ ...c, timeout: t })
);

timeoutOpt.get({ debug: true });           // undefined
timeoutOpt.get({ timeout: 5000 });         // 5000
timeoutOpt.modify({ timeout: 1000 }, t => t * 2);  // { timeout: 2000 }
timeoutOpt.modify({ debug: true }, t => t * 2);    // no-op
```

### `index<A>(i)` — Array element Optional

```typescript
import { index } from "lenskit";

const first = index<number>(0);
first.get([10, 20, 30]);      // 10
first.set([10, 20, 30], 99);  // [99, 20, 30]
```

### `find<A>(predicate)` — Find element Optional

```typescript
import { find } from "lenskit";

const findUser = find<User>(u => u.id === 42);
findUser.modify(users, u => ({ ...u, active: true }));
```

### Composition

```typescript
// Compose Lens + Lens → Lens
const cityLens = prop<User, "address">("address")
  .compose(prop<Address, "city">("city"));

// Compose Lens + Optional → Optional
const firstUserCity = prop<State, "users">("users")
  .composeOptional(index<User>(0))
  .compose(prop<User, "address">("address").composeOptional(
    optional<Address, string>(a => a.city, (a, c) => ({ ...a, city: c }))
  ));

firstUserCity.get(state);          // "NYC" | undefined
firstUserCity.set(state, "Boston"); // new state with city updated
```

### `each<A>()` — Traversal over array elements

```typescript
import { each } from "lenskit";

const numberEach = each<number>();
numberEach.getAll([1, 2, 3]);           // [1, 2, 3]
numberEach.modify([1, 2, 3], n => n*2); // [2, 4, 6]
numberEach.set([1, 2, 3], 0);           // [0, 0, 0]
```

### `values<K, A>()` — Traversal over Record values

```typescript
import { values } from "lenskit";

const scoreValues = values<string, number>();
scoreValues.modify({ alice: 90, bob: 85 }, s => s + 5);
// { alice: 95, bob: 90 }
```

## Complete example: Redux-style reducer

```typescript
import { prop, index, each } from "lenskit";

interface Todo { id: number; text: string; done: boolean }
interface State { todos: Todo[]; filter: string }

const todosLens = prop<State, "todos">("todos");
const allDoneLens = todosLens.compose(
  traversal<Todo[], boolean>(
    todos => todos.map(t => t.done),
    (todos, fn) => todos.map(t => ({ ...t, done: fn(t.done) }))
  ) as any
);

function reducer(state: State, action: { type: string; id?: number }): State {
  switch (action.type) {
    case "COMPLETE_ALL":
      return todosLens.modify(state, todos =>
        todos.map(t => ({ ...t, done: true }))
      );
    case "TOGGLE":
      return todosLens.modify(state, todos =>
        todos.map(t => t.id === action.id ? { ...t, done: !t.done } : t)
      );
    default:
      return state;
  }
}
```

## License

MIT

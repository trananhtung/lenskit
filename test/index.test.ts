import { lens, prism, optional, prop, index, find, traversal, each, values } from "../src/index.js";

// Test types
interface Address {
  street: string;
  city: string;
  zip: string;
}

interface User {
  name: string;
  age: number;
  address: Address;
  tags: string[];
}

// ── lens() ──────────────────────────────────────────────────────────────────

describe("lens() factory", () => {
  const nameLens = lens<User, string>(
    u => u.name,
    (u, n) => ({ ...u, name: n })
  );

  test("get reads the field", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    expect(nameLens.get(user)).toBe("Alice");
  });

  test("set returns new object with field changed", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    const updated = nameLens.set(user, "Bob");
    expect(updated.name).toBe("Bob");
    expect(user.name).toBe("Alice"); // original unchanged
  });

  test("modify applies a function", () => {
    const user: User = { name: "alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    const updated = nameLens.modify(user, s => s.toUpperCase());
    expect(updated.name).toBe("ALICE");
  });

  test("set does not mutate the original", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    const original = { ...user };
    nameLens.set(user, "Bob");
    expect(user).toEqual(original);
  });
});

// ── prop() ──────────────────────────────────────────────────────────────────

describe("prop() key lens", () => {
  const ageLens = prop<User, "age">("age");

  test("get reads property", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    expect(ageLens.get(user)).toBe(30);
  });

  test("set returns updated object", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    const updated = ageLens.set(user, 31);
    expect(updated.age).toBe(31);
    expect(updated.name).toBe("Alice"); // other fields preserved
  });

  test("modify increments age", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    const updated = ageLens.modify(user, n => n + 1);
    expect(updated.age).toBe(31);
  });
});

// ── Lens.compose() ──────────────────────────────────────────────────────────

describe("Lens.compose()", () => {
  const addressLens = prop<User, "address">("address");
  const cityLens = prop<Address, "city">("city");
  const userCityLens = addressLens.compose(cityLens);

  test("composed get reads nested field", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    expect(userCityLens.get(user)).toBe("NYC");
  });

  test("composed set updates nested field immutably", () => {
    const user: User = { name: "Alice", age: 30, address: { street: "1 Main St", city: "NYC", zip: "10001" }, tags: [] };
    const updated = userCityLens.set(user, "LA");
    expect(updated.address.city).toBe("LA");
    expect(updated.address.street).toBe("1 Main St"); // sibling preserved
    expect(updated.name).toBe("Alice"); // parent preserved
    expect(user.address.city).toBe("NYC"); // original unchanged
  });

  test("three-level composition", () => {
    interface Org { users: User[]; name: string }
    const orgUsersLens = prop<Org, "users">("users");
    const firstUserLens = index<User>(0);
    const cityDeep = orgUsersLens.composeOptional(firstUserLens).compose(
      prop<User, "address">("address").composeOptional(
        optional<Address, string>(a => a.city, (a, c) => ({ ...a, city: c }))
      )
    );
    const org: Org = {
      name: "Acme",
      users: [
        { name: "Alice", age: 30, address: { street: "1 Main", city: "NYC", zip: "10001" }, tags: [] }
      ]
    };
    expect(cityDeep.get(org)).toBe("NYC");
    const updated = cityDeep.set(org, "Boston");
    expect(updated.users[0].address.city).toBe("Boston");
  });
});

// ── prism() ──────────────────────────────────────────────────────────────────

type Shape = { type: "circle"; radius: number } | { type: "square"; side: number };

describe("prism() factory", () => {
  const circlePrism = prism<Shape, number>(
    s => s.type === "circle" ? s.radius : undefined,
    (s, r) => ({ ...s, type: "circle", radius: r } as Shape)
  );

  test("get returns value when predicate matches", () => {
    const circle: Shape = { type: "circle", radius: 5 };
    expect(circlePrism.get(circle)).toBe(5);
  });

  test("get returns undefined when predicate does not match", () => {
    const square: Shape = { type: "square", side: 3 };
    expect(circlePrism.get(square)).toBeUndefined();
  });

  test("set replaces value", () => {
    const circle: Shape = { type: "circle", radius: 5 };
    const updated = circlePrism.set(circle, 10);
    expect((updated as { type: "circle"; radius: number }).radius).toBe(10);
  });

  test("modify applies function when matches", () => {
    const circle: Shape = { type: "circle", radius: 5 };
    const updated = circlePrism.modify(circle, r => r * 2);
    expect((updated as { type: "circle"; radius: number }).radius).toBe(10);
  });

  test("modify is no-op when does not match", () => {
    const square: Shape = { type: "square", side: 3 };
    const updated = circlePrism.modify(square, r => r * 2);
    expect(updated).toEqual(square);
  });
});

// ── optional() ──────────────────────────────────────────────────────────────

describe("optional() factory", () => {
  interface Config { debug?: boolean; timeout?: number }
  const timeoutOpt = optional<Config, number>(
    c => c.timeout,
    (c, t) => ({ ...c, timeout: t })
  );

  test("get returns value when present", () => {
    expect(timeoutOpt.get({ debug: true, timeout: 5000 })).toBe(5000);
  });

  test("get returns undefined when absent", () => {
    expect(timeoutOpt.get({ debug: false })).toBeUndefined();
  });

  test("set adds/updates the field", () => {
    const updated = timeoutOpt.set({}, 3000);
    expect(updated.timeout).toBe(3000);
  });

  test("modify updates if present", () => {
    const updated = timeoutOpt.modify({ timeout: 1000 }, t => t * 2);
    expect(updated.timeout).toBe(2000);
  });

  test("modify is no-op if absent", () => {
    const config: Config = { debug: true };
    const updated = timeoutOpt.modify(config, t => t * 2);
    expect(updated).toEqual(config);
  });
});

// ── index() ──────────────────────────────────────────────────────────────────

describe("index() array element optional", () => {
  const secondElement = index<number>(1);

  test("get retrieves element at index", () => {
    expect(secondElement.get([10, 20, 30])).toBe(20);
  });

  test("get returns undefined for out-of-bounds", () => {
    expect(secondElement.get([10])).toBeUndefined();
  });

  test("set replaces element immutably", () => {
    const arr = [10, 20, 30];
    const updated = secondElement.set(arr, 99);
    expect(updated).toEqual([10, 99, 30]);
    expect(arr).toEqual([10, 20, 30]); // original unchanged
  });

  test("modify updates element", () => {
    const arr = [1, 2, 3];
    const updated = secondElement.modify(arr, n => n * 10);
    expect(updated).toEqual([1, 20, 3]);
  });
});

// ── find() ───────────────────────────────────────────────────────────────────

describe("find() element optional", () => {
  interface Item { id: number; value: string }
  const findById2 = find<Item>(item => item.id === 2);

  test("get returns matching element", () => {
    const items: Item[] = [{ id: 1, value: "a" }, { id: 2, value: "b" }];
    expect(findById2.get(items)).toEqual({ id: 2, value: "b" });
  });

  test("get returns undefined if no match", () => {
    const items: Item[] = [{ id: 1, value: "a" }];
    expect(findById2.get(items)).toBeUndefined();
  });

  test("set replaces first matching element", () => {
    const items: Item[] = [{ id: 1, value: "a" }, { id: 2, value: "b" }, { id: 3, value: "c" }];
    const updated = findById2.set(items, { id: 2, value: "UPDATED" });
    expect(updated).toEqual([
      { id: 1, value: "a" },
      { id: 2, value: "UPDATED" },
      { id: 3, value: "c" }
    ]);
  });

  test("set is no-op when no match", () => {
    const items: Item[] = [{ id: 1, value: "a" }];
    const updated = findById2.set(items, { id: 2, value: "new" });
    expect(updated).toEqual(items);
  });
});

// ── Traversal ────────────────────────────────────────────────────────────────

describe("each() traversal over array elements", () => {
  const numberEach = each<number>();

  test("getAll returns all elements", () => {
    expect(numberEach.getAll([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test("modify transforms all elements", () => {
    const result = numberEach.modify([1, 2, 3], n => n * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  test("set replaces all elements with same value", () => {
    expect(numberEach.set([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  test("empty array", () => {
    expect(numberEach.getAll([])).toEqual([]);
    expect(numberEach.modify([], n => n + 1)).toEqual([]);
  });
});

describe("values() traversal over Record values", () => {
  type Scores = Record<string, number>;
  const scoreValues = values<string, number>();

  test("getAll returns all values", () => {
    const scores: Scores = { alice: 90, bob: 85 };
    expect(scoreValues.getAll(scores).sort((a, b) => a - b)).toEqual([85, 90]);
  });

  test("modify transforms all values", () => {
    const scores: Scores = { alice: 90, bob: 85 };
    const updated = scoreValues.modify(scores, s => s + 5);
    expect(updated).toEqual({ alice: 95, bob: 90 });
  });

  test("set replaces all values", () => {
    const scores: Scores = { alice: 90, bob: 85 };
    const updated = scoreValues.set(scores, 100);
    expect(updated).toEqual({ alice: 100, bob: 100 });
  });
});

describe("traversal().compose()", () => {
  const t1 = each<number[]>();
  const t2 = each<number>();
  const nested = t1.compose(t2);

  test("composes traversals to drill into nested structure", () => {
    const matrix = [[1, 2], [3, 4], [5, 6]];
    expect(nested.getAll(matrix)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(nested.modify(matrix, n => n * 10)).toEqual([[10, 20], [30, 40], [50, 60]]);
  });
});

// ── Prism.compose() ──────────────────────────────────────────────────────────

describe("Prism.compose()", () => {
  type Outer = { inner?: { value?: number } };
  const innerPrism = prism<Outer, { value?: number }>(
    o => o.inner,
    (o, i) => ({ ...o, inner: i })
  );
  const valuePrism = prism<{ value?: number }, number>(
    x => x.value,
    (x, v) => ({ ...x, value: v })
  );
  const composed = innerPrism.compose(valuePrism);

  test("get follows both prisms", () => {
    expect(composed.get({ inner: { value: 42 } })).toBe(42);
    expect(composed.get({ inner: {} })).toBeUndefined();
    expect(composed.get({})).toBeUndefined();
  });

  test("set updates at both levels", () => {
    const updated = composed.set({ inner: { value: 1 } }, 99);
    expect(updated.inner?.value).toBe(99);
  });
});

// ── Real-world example ───────────────────────────────────────────────────────

describe("Real-world: deep immutable update", () => {
  interface AppState {
    users: User[];
    settings: { theme: string; language: string };
  }

  const state: AppState = {
    users: [
      { name: "Alice", age: 30, address: { street: "1 Main", city: "NYC", zip: "10001" }, tags: ["admin"] },
      { name: "Bob", age: 25, address: { street: "2 Oak", city: "LA", zip: "90001" }, tags: [] }
    ],
    settings: { theme: "dark", language: "en" }
  };

  test("update first user city via composed lenses", () => {
    const usersLens = prop<AppState, "users">("users");
    const firstUser = usersLens.composeOptional(index<User>(0));
    const address = firstUser.compose(
      optional<User, Address>(u => u.address, (u, a) => ({ ...u, address: a }))
    );
    const city = address.compose(
      optional<Address, string>(a => a.city, (a, c) => ({ ...a, city: c }))
    );

    const updated = city.set(state, "Boston");
    expect(updated.users[0].address.city).toBe("Boston");
    expect(updated.users[1].address.city).toBe("LA"); // not affected
    expect(state.users[0].address.city).toBe("NYC"); // original unchanged
  });

  test("bulk update all user ages via traversal", () => {
    const usersLens = prop<AppState, "users">("users");
    const allUsers = traversal<AppState, User>(
      s => s.users,
      (s, fn) => ({ ...s, users: s.users.map(fn) })
    );
    const allAges = allUsers.compose(
      traversal<User, number>(
        u => [u.age],
        (u, fn) => ({ ...u, age: fn(u.age) })
      )
    );

    const updated = allAges.modify(state, age => age + 1);
    expect(updated.users[0].age).toBe(31);
    expect(updated.users[1].age).toBe(26);
    expect(state.users[0].age).toBe(30); // original unchanged
  });
});

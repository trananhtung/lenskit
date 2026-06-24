// src/lens.ts
var LensImpl = class {
  constructor(_get, _set) {
    this._get = _get;
    this._set = _set;
  }
  get(s) {
    return this._get(s);
  }
  set(s, a) {
    return this._set(s, a);
  }
  modify(s, fn) {
    return this._set(s, fn(this._get(s)));
  }
  compose(other) {
    return lens(
      (s) => other.get(this._get(s)),
      (s, b) => this._set(s, other.set(this._get(s), b))
    );
  }
  composePrism(other) {
    return optional(
      (s) => other.get(this._get(s)),
      (s, b) => this._set(s, other.set(this._get(s), b))
    );
  }
  composeOptional(other) {
    return optional(
      (s) => other.get(this._get(s)),
      (s, b) => this._set(s, other.set(this._get(s), b))
    );
  }
};
var PrismImpl = class {
  constructor(_get, _set) {
    this._get = _get;
    this._set = _set;
  }
  get(s) {
    return this._get(s);
  }
  set(s, a) {
    return this._set(s, a);
  }
  modify(s, fn) {
    const a = this._get(s);
    return a !== void 0 ? this._set(s, fn(a)) : s;
  }
  compose(other) {
    return prism(
      (s) => {
        const a = this._get(s);
        return a !== void 0 ? other.get(a) : void 0;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== void 0 ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
  composeLens(other) {
    return optional(
      (s) => {
        const a = this._get(s);
        return a !== void 0 ? other.get(a) : void 0;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== void 0 ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
};
var OptionalImpl = class {
  constructor(_get, _set) {
    this._get = _get;
    this._set = _set;
  }
  get(s) {
    return this._get(s);
  }
  set(s, a) {
    return this._set(s, a);
  }
  modify(s, fn) {
    const a = this._get(s);
    return a !== void 0 ? this._set(s, fn(a)) : s;
  }
  modifyOption(s, fn) {
    return this.modify(s, fn);
  }
  compose(other) {
    return optional(
      (s) => {
        const a = this._get(s);
        return a !== void 0 ? other.get(a) : void 0;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== void 0 ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
  composeLens(other) {
    return optional(
      (s) => {
        const a = this._get(s);
        return a !== void 0 ? other.get(a) : void 0;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== void 0 ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
  composePrism(other) {
    return optional(
      (s) => {
        const a = this._get(s);
        return a !== void 0 ? other.get(a) : void 0;
      },
      (s, b) => {
        const a = this._get(s);
        return a !== void 0 ? this._set(s, other.set(a, b)) : s;
      }
    );
  }
};
function lens(get, set) {
  return new LensImpl(get, set);
}
function prism(get, set) {
  return new PrismImpl(get, set);
}
function optional(get, set) {
  return new OptionalImpl(get, set);
}
function prop(key) {
  return lens(
    (s) => s[key],
    (s, a) => ({ ...s, [key]: a })
  );
}
function index(i) {
  return optional(
    (arr) => arr[i],
    (arr, a) => {
      const copy = [...arr];
      copy[i] = a;
      return copy;
    }
  );
}
function find(predicate) {
  return optional(
    (arr) => arr.find(predicate),
    (arr, a) => {
      const i = arr.findIndex(predicate);
      if (i === -1) return arr;
      const copy = [...arr];
      copy[i] = a;
      return copy;
    }
  );
}
var TraversalImpl = class {
  constructor(_getAll, _modify) {
    this._getAll = _getAll;
    this._modify = _modify;
  }
  getAll(s) {
    return this._getAll(s);
  }
  modify(s, fn) {
    return this._modify(s, fn);
  }
  set(s, a) {
    return this._modify(s, () => a);
  }
  compose(other) {
    return traversal(
      (s) => this._getAll(s).flatMap((a) => other.getAll(a)),
      (s, fn) => this._modify(s, (a) => other.modify(a, fn))
    );
  }
};
function traversal(getAll, modify) {
  return new TraversalImpl(getAll, modify);
}
function each() {
  return traversal(
    (arr) => [...arr],
    (arr, fn) => arr.map(fn)
  );
}
function values() {
  return traversal(
    (obj) => Object.values(obj),
    (obj, fn) => {
      const result = {};
      for (const k of Object.keys(obj)) result[k] = fn(obj[k]);
      return result;
    }
  );
}
export {
  each,
  find,
  index,
  lens,
  optional,
  prism,
  prop,
  traversal,
  values
};
//# sourceMappingURL=index.js.map
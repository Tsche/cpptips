---
title: 'Are your maps allocating unnecessarily?'
description: 'Use of heterogeneous lookup on (un)ordered containers to prevent allocation and enforce class invariants'
pubDate: 2026-10-15
tags: [C++]
categories: [C++]
toc: false
authors:
  - name: Matthew Taylor
    url: https://sub.fail
---

Consider a map with a `std::string` as the key type, for example mapping an HTTP route to its handler:

```cpp
std::unordered_map<std::string, Handler const*> handlers;
```

What actually happens when you try to look things up in this map? Let's say that you want to test it with `handlers.find("/api/v2/accounts/positions/summary")`. This code will compile and run quite happily, but under the hood this allocates the literal into an entirely new `std::string` object, hashes it, finds the value, and then throws the temporary string away.

<!-- more -->

You will see this far more directly if, as a good C++ developer, you make appropriate use of `std::string_view` when writing interfaces around that map:

```cpp
Handler const* handle(std::string_view route) {
  if (handlers.contains(route)) { // error: no matching member function
    // ...
  }
  // ...
}
```

Conversions from `std::string_view` to `std::string` must be explicit, and the lookup function this code attempts to call will only accept a `std::string`, so the code is ill-formed.

Fortunately, there is a way around this which requires no change to the caller code. Heterogeneous lookup allows different types to be compared to the key type directly rather than converted to the key type first and then compared. It applies to ordered containers (i.e. `std::map`, `std::set`, `std::multiset`, and `std::multimap`; [N3657](https://wg21.link/n3657)) as of C++14, and unordered containers (i.e. `std::unordered_map`, `std::unordered_set`, etc; [P0919](https://wg21.link/p0919), [P1690](https://wg21.link/p1690)) as of C++20. It is opt-in, so existing containers are unaffected, and is enabled via the comparator (and hasher for unordered containers) having an `is_transparent` member typedef. So:

```cpp
std::unordered_map<std::string, Handler const*> handlers; // will allocate
std::unordered_map<std::string, Handler const*, StringHasher, std::equal_to<>> handlers; // no allocations
```

The comparator is (usually) the easy half. So long as your lookup type is less-than comparable to the container's key type for ordered maps, or equality comparable for unordered ones, you can use `std::less<>` and `std::equal_to<>`. These are the `void` specialisations of `std::less` and `std::equal_to`, expose `is_transparent`, and deduce the types used for comparison.

The hasher is the other half, and something you will need to make yourself. You need a class with call operators for each type you want to use for lookup. A minimal example, missing production-ready tweaks like `noexcept` or your choice of attributes, might be:

```cpp
struct StringHasher {
  using is_transparent = void;
  std::size_t operator()(std::string_view str) const {
    return std::hash<std::string_view>{}(str);
  }
};
```

And it's that simple. Now any type which is implicitly convertible to `std::string_view` and `==` comparable to `std::string` (assuming `std::equal_to<>`) will just work for lookup, no allocation required.

Now, say that as time goes on you migrate to a dedicated `http_route` class. Heterogeneous lookup can aid with migration by allowing the maps to be updated without imposing a migration constraint on all of their calling code:

```cpp
struct http_hasher {
  using is_transparent = void;
  std::size_t operator()(std::string_view str) const {
    return std::hash<std::string_view>{}(str);
  }
  std::size_t operator()(http_route const& route) const {
    return (*this)(route.to_sv());
  }
};

std::unordered_map<http_route, Handler const*, http_hasher, std::equal_to<>> handlers;
```

And now strings continue to work, but the new `http_route` class does too, so you can gradually migrate the rest of your codebase. Note that as before, you will need `http_route` to be `==` comparable to `std::string_view` and other lookup types, or provide a comparator which handles this for you.

This feature isn't just about optimising for strings though - it can be used to enforce class invariants. Given a set of `unique_ptr`, the only way to look up elements without this feature is to weaken ownership semantics, e.g. by wrapping the pointer in a class which intentionally releases the pointer on destruction rather than destroys it. With heterogeneous lookup, you can define a custom comparator (needed to compare `unique_ptr<T>` and `T*`) and a custom hasher for an unordered container, and looking up the instance from a non-owning pointer becomes trivial.

Note that this doesn't apply to all member functions of the containers: `erase` and `extract` only gained this support in C++23 ([P2077](https://wg21.link/p2077)), and `operator[]` and `at()` in C++26 ([P2363](https://wg21.link/p2363)).

## Conclusion

- By default, the ordered and unordered containers in the standard library match key types exactly on lookup, and this can lead to unexpected allocation.
- In C++14 this can be mitigated for ordered containers by using a type with an `is_transparent` member typedef in the container type, and `std::less<>` provides this for you.
- In C++20 this can be mitigated for unordered containers by providing a hasher _and_ comparator with the typedef, the latter of which is provided by `std::equal_to<>`.
- This can serve as both an optimisation and a means of controlling unexpected conversions and maintaining class invariants.

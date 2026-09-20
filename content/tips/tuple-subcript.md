---
title: 'Can you subscript tuples?'
description: 'Improving tuple syntax by abusing non-standard Clang extensions'
pubDate: 2026-09-20
tags: [C++, Clang]
categories: [C++]
toc: false
---

In C++ tuples are implemented as library feature rather than as language feature. As a consequence of that, we are syntactically limited by what the language offers.

This means rather than being able to subscript tuples directly, we need to use `std::get<N>(tup)` instead.

So... if we step a bit outside of the boundaries of the standard, can we subscript instead?

```cpp
auto tup = nonstd::tuple(1, 'c', 3.2);
f(tup[0], tup[2]);
```

<!-- more -->

This code can be made valid by using Clang's non-standard [`enable_if` attribute](https://clang.llvm.org/docs/AttributeReference.html#enable-if).

The pattern is rather simple - we just need to introduce an `operator[]` that statically checks the argument for every possible index. That looks something like this:

```cpp
template <class T, std::size_t Idx>
struct add_subscript {
  constexpr decltype(auto) operator[](std::size_t i)
    __attribute__((enable_if(i == I, "")))
  { return std::get<I>(*static_cast<T*>(this)); }
};
```

`T` is our CRTP base here, eventually we'll cast up to that base class to perform the actual `get` call.
We can pull all of those `operator[]`s into the same scope by inheriting from `add_subscript` for every possible index:

```cpp
template <class T,
          class = std::make_index_sequence<std::tuple_size_v<T>>>
struct subscripts;

template <class T, std::size_t... Is>
struct subscripts<T, std::index_sequence<Is...>>
  : add_subscript<T, Is>... {
    using add_subscript<T, Is>::operator[]...;
};
```

Finally, those `operator[]` overloads need to be pulled into our augmented `tuple`:

```cpp
template <class... Ts>
struct tuple
  : std::tuple<Ts...>, subscripts<tuple<Ts...>> {
    using std::tuple<Ts...>::tuple;
};

template <class... Ts>
tuple(Ts...) -> tuple<Ts...>;
```

We do not need to provide `get`, but for this to be recognized as a tuple-like type we still require specializations for `std::tuple_size` and `std::tuple_element`. That's rather easy:

```cpp
template <class... Ts>
struct std::tuple_size<nonstd::tuple<Ts...>>
    : std::tuple_size<std::tuple<Ts...>> {};

template <std::size_t I, class... Ts>
struct std::tuple_element<I, nonstd::tuple<Ts...>>
    : std::tuple_element<I, std::tuple<Ts...>> {};
```

<Aside type="tip">

To get a slightly nicer diagnostic when `i` was either out of range or not a constant expression, `subscripts` can be extended with two deleted `operator[]` overloads:

```cpp
constexpr void operator[](std::size_t i) const = delete("'i' is not in range");
constexpr void operator[](std::size_t i) const
  __attribute__((enable_if(!__builtin_constant_p(i), "")))
= delete("'i' is not a constant expression");
```

`__builtin_constant_p` lets us determine if the argument was known to be constant at compile time. Clang's documentation defers to [GCC documentation](https://gcc.gnu.org/onlinedocs/gcc/Other-Builtins.html#index-_005f_005fbuiltin_005fconstant_005fp) about this.

</Aside>

Here's the full example: [Compiler Explorer](https://compiler-explorer.com/z/Ya1Wf8a6x)

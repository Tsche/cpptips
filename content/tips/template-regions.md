---
title: "Your compiler complains you're not in template context?"
description: 'Using C++26 expansion statements to introduce explicit template regions.'
pubDate: 2026-09-17
tags: [C++, Clang]
categories: [C++]
toc: false
---

This can happen if you attempt to use P1061 pack-introducing structured bindings outside of a template:

```cpp
void f() {
  // error: can only introduce packs in templates
  constexpr auto [...Is] = expr;
}
```

To avoid turning `f` itself into a template, you can use P1306 expansion statements. Unlike lambda solutions, this does not push another function scope.

<!-- more -->

```cpp
void f() {
  template for(auto _:"") {
    constexpr auto [...Is] = expr;
  }
}
```

Expanding over an empty string literal causes exactly one expansion.

For structured bindings that introduce packs, the pack is required to be a templated entity ([[dcl.pre]/7](https://eel.is/c++draft/dcl.pre#7)).
Thanks [CWG 3119](https://cplusplus.github.io/CWG/issues/3119.html) entities defined in an expansion statement are considered templated ([[temp.pre]/8.2](https://eel.is/c++draft/temp.pre#8.2)).

Since this does not introduce another function scope, we can still splice variables just fine. For example, consider:

```cpp
void f(int a, char b, float c) {
  template for(auto _:"") {
    constexpr auto cur = std::meta::current_function();
    constexpr auto [...Is] = std::make_index_sequence<parameters_of(cur).size()>();
    g([:parameters_of(cur)[Is]:]...);
  }
}
```

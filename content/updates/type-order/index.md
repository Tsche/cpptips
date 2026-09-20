---
title: 'Which comes first - int or float?'
description: 'C++26 std::type_order provides an implementation-defined total ordering of types, enabling simpler canonicalization and deduplication. Now you can use it.'
pubDate: 2026-09-01
tags: [C++, C++26, Metaprogramming, Clang]
categories: [C++]
heroImage: ./type-order.jpg
heroImageAlt: 'Comparing the ordering of C++ types with std::type_order'
toc: false
---

Clang now has an answer for you: it depends™

C++26 introduced `std::type_order` from [P2830](https://wg21.link/p2830) to answer this very question.
GCC has had support for it for quite a while; now Clang does too. Earlier today I merged the required changes to libc++. My implementation of the underlying builtin used to implement this was merged into Clang about two weeks ago.

So, why would you compare types in the first place and what does "it depends" mean?

<!-- more -->

If you know me, you've probably already guessed that this is yet another somewhat arcane metaprogramming thing. You're right, it is - but it's also incredibly useful.
Given a total ordering of all types, we can trivially sort lists of types - that greatly simplifies deduplication and gives us the ability to canonicalize (e.g. variants), which in turn can help reduce binary size and aid with designing less error-prone interfaces. The paper has some very interesting examples on this: https://wg21.link/p2830

The reason why the answer is "it depends" is because of how it works. The actual ordering was purposefully left implementation-defined - in both GCC and Clang that total strong ordering of all types is calculated by mangling the names of the types and doing a lexicographical comparison on the result. The mangling scheme depends on your target ABI.

For Clang this matters because we target both the Itanium ABI and the Microsoft ABI. Here we can observe the difference pretty easily:

```cpp
struct A {};
static_assert(std::type_order<A, int> == std::strong_order::less);
```

This assertion holds when targeting the Microsoft ABI, but not with the Itanium ABI. [Try the example on Compiler Explorer](https://lnkd.in/e_QRkyTd).

Anyway, that's all. Have a nice day and thanks to all the awesome people who worked on this excellent paper, answered questions about GCC's implementation choices, discussed and reviewed my patches :)

- [Clang changes](https://lnkd.in/e2DyQhWd)
- [libc++ changes](https://lnkd.in/eDkazv5P)

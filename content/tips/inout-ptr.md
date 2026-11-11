---
title: 'Safely interfacing with C-style factories'
description: 'Use of std::out_ptr and std::inout_ptr to combine smart pointer resource ownership with C-style double-pointer interfaces'
pubDate: 2026-11-09
tags: [C++]
categories: [C++]
toc: false
authors:
  - name: Matthew Taylor
    url: https://sub.fail
---

Consider a factory function which creates a widget at the end of a double pointer:

```cpp
void create_widget(Widget** ptr);
```

Being a good C++ developer, you want to manage your Widgets with smart pointers. This means that you need to do a little dance to set up the ownership:

```cpp
std::unique_ptr<Widget> ptr();
// Needs a separate variable otherwise we try to take the address of an rvalue
Widget* raw_ptr = nullptr;
create_widget(&raw_ptr);
ptr.reset(raw_ptr); // Forget this and we leak
```

C++23 gives you a better way to do this, with `std::out_ptr`.

<!-- more -->

`std::out_ptr` takes a smart pointer and creates an object of type `std::out_ptr_t`, whose construction and destruction will automatically handle getting the underlying pointer, passing it into the function, and resetting it into your smart pointer for you. The above code just becomes:

```cpp
std::unique_ptr<Widget> ptr();
create_widget(std::out_ptr(ptr));
```

For functions which replace an existing instance instead of creating a fresh one at the end of a null pointer, we have `std::inout_ptr`, which transforms code which looks like this:

```cpp
auto ptr = std::make_unique<Widget>(...);
auto raw_ptr = ptr.release(); // Must be release specifically to prevent a double free.
replace_widget(raw_ptr);
ptr.reset(raw_ptr);           // Again, forget this and we leak
```

To code which looks like this:

```cpp
auto ptr = std::make_unique<Widget>(...);
replace_widget(std::inout_ptr(ptr));
```

This is more than just a convenience wrapper, however. It adds RAII-style leak-prevention to the error cases:

```cpp
auto raw_ptr = ptr.release();
if(replace_widget(raw_ptr) != 0){
    return -1;  // Whoops, you just leaked the object at the end of raw_ptr
}
ptr.reset(raw_ptr);
```

And factories which accept a `void**` can be passed a `std::out_ptr<void*>(ptr)` without needing any manual casting (and a manual `reinterpret_cast<void**>(&raw_ptr)` is UB).

The examples so far have used `unique_ptr` for simplicity, but compatibility extends to other standard library and user-defined pointer types:

| Pointer Type              | `std::out_ptr` supported?                                                                | `std::inout_ptr` supported?                         |
| ------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `std::unique_ptr`         | Yes                                                                                      | Yes                                                 |
| `std::shared_ptr`         | Yes, but if using a custom deleter this must be provided manually                        | No                                                  |
| `T*`                      | Yes                                                                                      | Yes                                                 |
| User-defined pointer type | Yes, if that type has a `reset()` member function or if `ptr = Pointer()` is well-formed | Yes, if that type has a `release()` member function |

There are also some caveats to know about:

- The pointers should be created inside the function call. You _can_ write `auto o_ptr = std::out_ptr(ptr)` but `ptr` won't be updated until `o_ptr` is destroyed.
- **You define the contract**. `std::out_ptr` and `std::inout_ptr` can't check whether they are being used for "true" out-ptr and inout-ptr semantics. You decide that by naming the type.

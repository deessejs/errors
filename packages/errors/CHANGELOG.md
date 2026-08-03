# @deessejs/errors

## 1.1.1

### Patch Changes

- Release v1.1.1: infrastructure improvements and SEO enhancements

  ### Fixed
  - Add changeset version step and tag push to release workflow
  - Add display flex to all OG image divs for Satori compatibility

  ### Changed
  - Comprehensive SEO optimization for @deessejs/errors website
  - Add banner image for OG social sharing
  - Add homepage URL to package.json for npm SEO
  - Add sitemap, robots.txt, homepage metadata and canonical URLs

## 1.1.0

### Minor Changes

- 65c9327: release v1.1.0: documentation overhaul, SEO improvements, CI enhancements

## 1.0.0

### Major Changes

- 50bf63f: ## v1.0.0 — Core Foundation

  Initial release of `@deessejs/errors`, a function-based error handling library inspired by Python's error system.

  ### Added
  - `error()` function for defining error types with Standard Schema support
  - `raise()` function for throwing errors
  - Native `throw` syntax support
  - `is()` function for type checking with inheritance support
  - `inherits` option for single and multiple inheritance
  - `.from()` method for exception chaining
  - `causes()` function for chain traversal (most recent first)
  - `err.fields` namespace for user-defined data
  - Message templates with `{field}` placeholders
  - All error properties always defined (never undefined)
  - Standard Schema compliance for field definitions (Zod, Valibot, ArkType)

  ### TypeScript Support
  - Generic types: `ErrorFactory<T>`, `ErrorInstance<T>`
  - Full type inference with fields
  - No `any` — only generics and proper types

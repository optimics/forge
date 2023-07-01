# Optimics eslint plugin

This plugin was created to match extra rules that are not available in classic
eslint rules.

## Installation

```shell
npm install --save-dev eslint-plugin-optimics
```

## Configuration

Add this to your `.eslintrc`

```JSON
{
  "plugins": ["optimics"],
  "extends": ["plugin:optimics/recommended"]
}
```

## Rules

### boolean-shortcuts

Tracks incomprehensible shortcuts like`!0`, `!1`, `!false`, `!true` and
replaces them with the default boolean notations: `true` or `false`.

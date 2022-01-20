# Optimics eslint preset

## Installation

```shell
npm install --save-dev eslint @optimics/eslint-config @babel/preset-env @babel/eslint-parser
```

## Manual configuration

Put this in your `.babelrc.json` in the root of your project.

```JSON
{
  "presets": [
    ["@babel/preset-env"]
  ]
}
```

Put this in your `.eslintrc.json` in the root of your project.

```
{
  "extends": [
    "@optimics/eslint-config"
  ]
}
```

And you're done

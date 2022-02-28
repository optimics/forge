# Optimics eslint preset

## Installation

```shell
npm install --save-dev @optimics/eslint-config @babel/preset-env @babel/eslint-parser
```

## Configuration

Add `@babel/preset-env` to your `.babelrc.json` in the root of your project if
you don't already have it.

```JSON
{
  "presets": [
    ["@babel/preset-env"]
  ]
}
```

Add `@optimics/eslint-config` to your `.eslintrc.json` in the root of your
project if you don't already have it.

```
{
  "extends": [
    "@optimics/eslint-config"
  ]
}
```

A couple of features might be useful to you. Consider the environment your
application is running in and maybe enable some of these in your
`.eslintrc.json`. Always turn on only what is needed, don't think into the
future.

* `browser` to enable web browser features, like `window`, `document`, etc
* `es6` is always useful when using newer versions of ECMAScript
* `jest` when testing in Jest framework
* `node` when running code in Node.js

```JSON
{
  "env": {
    [YOUR-FEATURE]: true
  }
}
```

## Editor configuration

### vim

Assuming, you have dense-analysis/ale installed, you only need to turn on
eslint as your linter and fixer.

```
let g:ale_fix_on_save = 1
let g:ale_fixers = {'javascript': ['eslint']}
let g:ale_linters = {'javascript': ['eslint']}
```

This little trick will also make your .vimrc compatible with other linters.
Enable all of your linters and fixers and disable them as needed based on the
specific project requirements.

This bit will turn on eslint only for javascript files and only if it finds a
file starting with `.eslintrc`.

```
let g:ale_fix_on_save = 1

function OhMyGlobItIsJavascript()
  if glob('.eslintrc*', '.;') != ''
    let g:ale_linters = { 'javascript': [ 'eslint' ] }
    let g:ale_fixers = { 'javascript': [ 'eslint' ] }
  endif
endfunction

autocmd FileType javascript call OhMyGlobItIsJavascript()
```

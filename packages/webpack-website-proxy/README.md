# `@optimics/webpack-website-proxy`

> Inject your webpack generated bundles inside a live website via proxy and
> webpack dev server

This is useful, when your webpack outputs enhance a website, instead of
rendering it as a whole. You can simply give it an URL and the webpack dev
server will load it up on localhost URL with your scripts generated and hot
reload included.

## Installation

```
npm install --save-dev @optimics/webpack-website-proxy
```

## Usage

Add [HtmlWebpackPlugin](https://www.npmjs.com/package/html-webpack-plugin) and WebsiteProxyPlugin In your webpack configuration:

```
import HtmlWebpackPlugin from 'html-webpack-plugin'
import WebsiteProxyPlugin from '@optimics/webpack-website-proxy'

export default {
  plugins: [
    new HtmlWebpackPlugin({}),
    new WebsiteProxyPlugin('http://example.com/url-to-the-page'),
  ],
}
```

## Known issues

**Red box errors**

Webpack will respond to all on page errors. Consider turning off [client overlay](https://webpack.js.org/configuration/dev-server/#overlay)

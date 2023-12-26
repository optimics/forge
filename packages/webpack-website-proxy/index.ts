import type { Request, Response } from 'express'
import { qsm } from 'query-string-manipulator'
import type { InnerCallback } from 'tapable'
import type { Compilation, Compiler } from 'webpack'
import type Server from 'webpack-dev-server'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import fetch from 'node-fetch'
import htmlParser from 'node-html-parser'

interface CompilerData {
  html: string
  outputName: string
  plugin: HtmlWebpackPlugin
}

type CompilerCallback = InnerCallback<Error, CompilerData>
type CompilerHandler = (
  data: CompilerData,
  cb: CompilerCallback,
) => Promise<void>
type TapHandler = (compilation: Compilation) => void

const allowedHeaders = [
  'content-type',
  'last-modified',
  'age',
  'server',
  'x-served-by',
]

function isAllowedHeader([name]: [string, string]) {
  return allowedHeaders.includes(name)
}

function proxyAsset(proxyWebsite: string) {
  return function (req: Request, res: Response, next: (_err?: Error) => void) {
    if (req.path) {
      const src = new URL(proxyWebsite)
      const url = qsm(`${src.protocol}//${src.hostname}${req.path}`, {
        set: req.query,
      })
      fetch(url)
        .then((proxyRes) => {
          const headers = Object.fromEntries(
            Array.from(proxyRes.headers).filter(isAllowedHeader),
          )
          res.set({
            ...headers,
            'access-control-allow-origin': '*',
          })
          proxyRes.body?.pipe(res)
        })
        .catch((e) => next(e))
    } else {
      next()
    }
  }
}

function proxyAssets(server: Server, proxyWebsite: string) {
  server.app?.use(proxyAsset(proxyWebsite))
}

export default class WebsiteProxyPlugin {
  websiteUrl: string

  constructor(websiteUrl: string) {
    this.websiteUrl = websiteUrl
  }

  proxyAssets(server: Server) {
    proxyAssets(server, this.websiteUrl)
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(this.constructor.name, this.getTapHandler())
  }

  getCompilerHandler(): CompilerHandler {
    return async (data: CompilerData, cb: CompilerCallback) => {
      try {
        data.html = this.injectContent(data, await this.fetchWebsiteHtml())
        cb(null, data)
      } catch (e) {
        cb(e)
      }
    }
  }

  getTapHandler(): TapHandler {
    return (compilation: Compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        this.constructor.name,
        this.getCompilerHandler(),
      )
    }
  }

  async fetchWebsiteHtml(): Promise<string> {
    const web = await fetch(this.websiteUrl)
    return await web.text()
  }

  injectContent(data: CompilerData, html: string): string {
    const compilerRoot = htmlParser.parse(data.html)
    const injectedElements = compilerRoot.querySelectorAll('script,link,style')
    const injectedContent = injectedElements.map((item) => item.toString())
    return html + injectedContent
  }
}

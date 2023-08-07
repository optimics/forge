import type { InnerCallback } from 'tapable'
import type { Compilation, Compiler } from 'webpack'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import fetch from 'node-fetch'
import htmlParser from 'node-html-parser'

interface CompilerData {
  html: string
  outputName: string
  plugin: HtmlWebpackPlugin
}

type CompilerCallback = InnerCallback<Error, CompilerData>
type CompilerHandler = (data: CompilerData, cb: CompilerCallback) => Promise<void>
type TapHandler = (compilation: Compilation) => void

export default class WebsiteProxyPlugin {
  websiteUrl: string

  constructor(websiteUrl: string) {
    this.websiteUrl = websiteUrl
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
        this.getCompilerHandler()
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
    const injectedContent = injectedElements.map(item => item.toString())
    return html + injectedContent
  }
}

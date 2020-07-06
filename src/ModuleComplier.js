const path = require('path')
const {
  EventEmitter
} = require('events')
const {
  debounce,
  cloneDeep
} = require('lodash')
const fs = require('fs').promises
const getConfig = require('./webpack.web.config')
const webpack = require('webpack')

class ModuleComplier extends EventEmitter {
  constructor(sourcePath, modulePath, memoryfs) {
    super()
    this.manifest = {}
    this.InputManifest = {}
    this.modulePath = modulePath
    this.complier = null
    this.watching = null
    this.moduleBase = path.resolve(sourcePath, modulePath)
    this.manifestFile = path.resolve(sourcePath, modulePath, 'manifest.json')
    this.debounce = debounce(this.readManifest.bind(this), 1000)
    this.debounce()
  }

  async readManifest() {
    var json = await fs.readFile(this.manifestFile)
    this.InputManifest = JSON.parse(json)
    this.manifest = cloneDeep(this.InputManifest)
    var entry = {}
    if (typeof this.InputManifest === 'object') {
      if (this.InputManifest.embed) {
        entry.embed = path.resolve(this.moduleBase, this.InputManifest.embed)
        this.manifest.embed = {
          css: `http://127.0.0.1:8369/static/${this.modulePath}/${this.modulePath}.embed.css`,
          js: `http://127.0.0.1:8369/static/${this.modulePath}/${this.modulePath}.embed.js`
        }
      }
      if (this.InputManifest.externalWindow) {
        entry.externalWindow = path.resolve(this.moduleBase, this.InputManifest.externalWindow)
        this.manifest.externalWindow = {
          css: `http://127.0.0.1:8369/static/${this.modulePath}/${this.modulePath}.externalWindow.css`,
          js: `http://127.0.0.1:8369/static/${this.modulePath}/${this.modulePath}.externalWindow.js`
        }
      }
      if (this.InputManifest.web) {
        entry.web = path.resolve(this.moduleBase, this.InputManifest.web)
        this.manifest.web = {
          css: `http://127.0.0.1:8369/static/${this.modulePath}/${this.modulePath}.web.css`,
          js: `http://127.0.0.1:8369/static/${this.modulePath}/${this.modulePath}.web.js`
        }
      }
    }
    if (this.complier !== null) {
      this.watching.close()
    }
    this.complier = webpack(getConfig(this.modulePath, entry, 'development'))
    this.watching = this.complier.watch({
      aggregateTimeout: 300,
      poll: undefined
    }, (err, stats) => {
      // 在这里打印 watch/build 结果...
      console.log(stats.toString({
        chunks: false,
        colors: true
      }));
    })
  }
}
module.exports = {
  ModuleComplier
}
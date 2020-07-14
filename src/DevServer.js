#!/usr/bin/env node

const url = require('url')
const express = require('express')
const fs = require('fs').promises
const {
  ModuleComplier
} = require('./ModuleComplier')
const MemoryFS = require('memory-fs')
const path = require('path')
const {
  cloneDeep
} = require('lodash')
const {
  Server
} = require('ws')


class DevServer {
  constructor(sourcePath = '.') {
    this.app = null
    this.port = 8369
    this.moduleList = []
    this.idMap = {}
    this.sourcePath = sourcePath
    this.memoryfs = new MemoryFS()
    this.inited = this.__init()
    this.addModule = this.addModule.bind(this)
    this.listen = this.listen.bind(this)
  }

  async __init() {
    var fileList = (await fs.readdir(this.sourcePath)).filter((e)=>{return e!=='dist'})

    var isModuleResult = await Promise.all(fileList.map((e) => {
      return isModule(path.resolve(this.sourcePath, e))
    }))

    var moduleList = fileList.filter((value, index) => {
      return isModuleResult[index]
    })

    await Promise.all(moduleList.map(this.addModule))
    await Promise.all(this.moduleList.map((e) => {
      return e.readManifest()
    }))
    this.inited = true
  }

  listen(port) {
    this.app = express()
    this.WSServer = new Server({
      host: '127.0.0.1',
      port: '8370'
    })
    this.app.get('/module/list', (req, res) => {
      var result = this.moduleList.map((e) => {
        var manifest = cloneDeep(e.manifest)
        var entries = ['embed', 'externalWindow', 'web']
        entries.forEach((e) => {
          if (manifest[e]) {
            manifest[e].reloadNotice = `ws://127.0.0.1:8370/reloadNotice?module=${manifest.id}`
          }
        })
        return manifest
      })
      res.json(result)
    })

    this.app.use('/static', (req, res, next) => {
      try {
        res.send(memoryfs.readFileSync(req.path))
      } catch (error) {
        next('route')
      }
    })
    this.app.use('/static', express.static('dist'))
    this.app.listen(8369, () => {
      console.log(`Danmaku Tree Tool listening at http://127.0.0.1:8369`)
    })
    console.log(`Danmaku Tree Tool listening at ws://127.0.0.1:8370`)
    this.WSServer.on('connection', (ws, request) => {
      let r = url.parse(request.url, true)
      ws.moduleName = r.query.module
    })
    this.moduleList.forEach((e) => {
      e.on('done', () => {
        this.WSServer.clients.forEach((client) => {
          if (client.moduleName === e.manifest.id) {
            client.send('reload')
          }
        })
      })
    })
  }

  async addModule(filepath) {
    var manifest = await fs.readFile(path.resolve(this.sourcePath, filepath, 'manifest.json'))
    if (!this.idMap[manifest.id]) {
      this.idMap[manifest.id] = filepath
    } else {
      console.log(`"${this.idMap[manifest.id]}" and "${filepath}" has same Id. Please Change It`)
    }
    this.moduleList.push(new ModuleComplier(this.sourcePath, filepath, this.memoryfs))
  }
}

async function isModule(modulePath) {
  try {
    var manifest = JSON.parse(await fs.readFile(path.resolve(modulePath, 'manifest.json'), {
      encoding: 'utf-8'
    }))
    return isManifest(manifest)
  } catch (error) {
    return false
  }
}

function isManifest(manifest) {
  if (typeof manifest.id === "string") {
    var id = manifest.id.toLowerCase()
    var match = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)
    if (match !== null && match[0] === id) {} else {
      return false
    }
  } else {
    return false
  }
  if (typeof manifest.name !== 'string') {
    return false
  }
  if (typeof manifest.description !== 'string') {
    return false
  }
  var entries = ["embed", "externalWindow", "web"]
  var num = 0
  var error = false
  entries.forEach((e) => {
    if (typeof manifest[e] === "undefined") {

    } else if (typeof manifest[e] === "string") {
      num++;
    } else {
      error = true
    }
  })
  if (error || num <= 0) {
    return false
  }
  return true
}

module.exports = DevServer
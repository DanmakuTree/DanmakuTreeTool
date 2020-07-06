const express = require('express')
const fs = require('fs')
const {
  ModuleComplier
} = require('./ModuleComplier')
const MemoryFS = require('memory-fs')
const path = require('path')

const port = 8369

const memoryfs = new MemoryFS()
const app = express()

const moduleList = []

const sourcePath = path.resolve(process.cwd(), process.argv[2] ? process.argv[2] : '.')

console.log(sourcePath)

var fileList = fs.readdirSync(sourcePath)

fileList.forEach((e) => {
  fs.stat(path.resolve(sourcePath, e), (err, stats) => {
    if (err) {
      console.error(`${e} : What is this shit, ignored: ${err.message}`)
      return
    }
    if (!stats.isDirectory()) {
      console.warn(`${e} is not Directory. ignored`)
      return
    }
    fs.stat(path.resolve(sourcePath, e, 'manifest.json'), (err, stats) => {
      if (err) {
        console.error(`${e} : What is this shit, ignored: ${err.message}`)
        return
      }
      if (!stats.isFile()) {
        console.warn(`${e}/manifest.json is not a File. ignored`)
        return
      }
      addModule(e)
    })
  })
})

function addModule(modulePath) {
  moduleList.push(new ModuleComplier(sourcePath, modulePath, memoryfs))
}


app.get('/module/list', (req, res) => {
  res.json(moduleList.map((e) => {
    return e.manifest
  }))
})

app.use('/static', (req, res, next) => {
  try {
    res.send(memoryfs.readFileSync(req.path))
  } catch (error) {
    next('route')
  }
})
app.use('/static', express.static('dist'))

app.listen(port, () => {
  console.log(`Danmaku Tree Tool listening at http://localhost:${port}`)
})
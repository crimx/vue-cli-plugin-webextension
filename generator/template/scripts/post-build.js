const fs = require('fs-extra')
const path = require('path')
const vueConfig = require('../vue.config')
const browsers = require('./browsers')

console.log('\n\nGenerating files for each browser target...')

const dist = path.join(__dirname, '../', vueConfig.outputDir || 'dist')
const originFiles = fs.readdirSync(dist)
const toCopyFiles = originFiles.filter(name => name !== 'index.html')

const pGenerating = browsers.map(async browser => {
  const dest = path.join(dist, browser)
  await fs.mkdir(dest)

  // Copy source files
  await Promise.all(
    toCopyFiles.map(filename =>
      fs.copy(path.join(dist, filename), path.join(dest, filename))
    )
  )

  // Copy polyfill
  await Promise.all([
    fs.copy(
      path.join(
        __dirname,
        '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js'
      ),
      path.join(dest, 'lib/browser-polyfill.min.js')
    ),
    fs.copy(
      path.join(
        __dirname,
        '../node_modules/webextension-polyfill/dist/browser-polyfill.min.js.map'
      ),
      path.join(dest, 'lib/browser-polyfill.min.js.map')
    )
  ])

  // Copy manifest
  const commonManifest = require('../src/manifest/common.manifest')
  const browserManifest = require(`../src/manifest/${browser}.manifest`)
  const version = require('../package.json').version
  await fs.writeJson(
    path.join(dest, 'manifest.json'),
    Object.assign({}, commonManifest, browserManifest, { version }),
    { spaces: 2 }
  )
})

Promise.all(pGenerating)
  .then(async () => {
    // Remove files
    await Promise.all(
      originFiles.map(filename => fs.remove(path.join(dist, filename)))
    )
    console.log('Done.\n\n')
  })
  .catch(e => {
    throw e
  })

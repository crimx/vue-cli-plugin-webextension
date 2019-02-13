const fs = require('fs-extra')
const _ = require('lodash')

module.exports = async api => {
  api.extendPackage({
    scripts: {
      build: 'vue-cli-service build && node scripts/post-build.js',
      zip: 'node scripts/zip.js'
    },
    dependencies: {
      'web-ext-types': '^3.1.0',
      'webextension-polyfill': '^0.4.0',
      'webextensions-emulator': '^1.0.0'
    },
    devDependencies: {
      archiver: '^3.0.0',
      'fs-extra': '^7.0.1'
    }
  })
  api.render('./template')

  const tsconfig = api.resolve('tsconfig.json')
  if (fs.existsSync(tsconfig)) {
    api.postProcessFiles(files => {
      Object.keys(files)
        .filter(name => /^src.*index\.js$/.test(name))
        .forEach(name => {
          files[name.slice(0, -2) + 'ts'] = files[name]
          delete files[name]
        })
    })

    const json = await fs.readJSON(tsconfig)
    const typeRoots = _.get(json, 'compilerOptions.typeRoots') || []
    _.set(
      json,
      'compilerOptions.typeRoots',
      Array.from(
        new Set([
          ...typeRoots,
          'node_modules/@types',
          'node_modules/web-ext-types'
        ])
      )
    )
    fs.writeJSON(tsconfig, json)
  }
}

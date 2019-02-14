const _ = require('lodash')

module.exports = api => {
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

  api.render('./template', {
    pkg: require(api.resolve('package.json'))
  })

  api.postProcessFiles(files => {
    if (files['tsconfig.json']) {
      // change entry files
      Object.keys(files)
        .filter(name => /^src.*index\.js$/.test(name))
        .forEach(name => {
          files[name.slice(0, -2) + 'ts'] = files[name]
          delete files[name]
        })

      try {
        const tsconfig = JSON.parse(files['tsconfig.json'])
        const typeRoots = _.get(tsconfig, 'compilerOptions.typeRoots') || []
        _.set(
          tsconfig,
          'compilerOptions.typeRoots',
          Array.from(
            new Set([
              ...typeRoots,
              'node_modules/@types',
              'node_modules/web-ext-types'
            ])
          )
        )
        files['tsconfig.json'] = JSON.stringify(tsconfig, null, '  ')
      } catch (e) {
        console.warn('cannot parse tsconfig.js')
      }
    }

    return files
  })
}

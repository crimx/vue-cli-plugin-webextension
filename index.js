const fs = require('fs')
const HTMLPlugin = require('html-webpack-plugin')
const argv = require('minimist')(process.argv.slice(2))

module.exports = api => {
  api.chainWebpack(config => {
    config.devServer.inline(false)

    config.entryPoints.clear()

    // only hash assets to avoid collision
    config.module
      .rule('images')
      .use('url-loader')
      .tap(options => {
        options.fallback.options.name = 'img/[hash].[ext]'
        return options
      })

    config.module
      .rule('svg')
      .use('file-loader')
      .tap(options => {
        options.name = 'img/[hash].[ext]'
        return options
      })

    config.module
      .rule('media')
      .use('url-loader')
      .tap(options => {
        options.fallback.options.name = 'media/[hash].[ext]'
        return options
      })

    config.module
      .rule('fonts')
      .use('url-loader')
      .tap(options => {
        options.fallback.options.name = 'fonts/[hash].[ext]'
        return options
      })

    if (process.env.NODE_ENV === 'development') {
      chainWebpackDev(config)
    } else {
      chainWebpackProd(config)
    }
  })

  function chainWebpackDev (config) {
    const entry =
      'src/' +
      (argv.pages
        ? `pages/${argv.pages}`
        : argv.contents
          ? `contents/${argv.contents}`
          : 'pages/popup')

    const fakeEntry = `${entry}/__fake__`

    config
      .entry('app')
      .add(api.resolve('node_modules/webextensions-emulator/dist/core'))
      .add(api.resolve('node_modules/webextension-polyfill'))
      .add(
        api.resolve(fs.existsSync(api.resolve(fakeEntry)) ? fakeEntry : entry)
      )

    config
      .entry('background')
      .add(api.resolve('node_modules/webextensions-emulator/dist/background'))
      .add(api.resolve('node_modules/webextension-polyfill'))
      .add(api.resolve('src/background'))

    config.plugin('html').tap(args => {
      args[0].filename = 'index.html'
      args[0].template = api.resolve('scripts/template.html')
      args[0].chunks = ['app', 'background']
      args[0].inject = false
      return args
    })
  }

  function chainWebpackProd (config) {
    // chunk files are loaded in manifest
    // disable chunk splitting
    const splitChunks = config.optimization.get('splitChunks')
    Object.keys(splitChunks.cacheGroups).forEach(name => {
      splitChunks.cacheGroups[name].chunks = chunk => {
        return !/^background|contents\//.test(chunk.name)
      }
    })
    config.optimization.splitChunks(splitChunks)

    // no need for local files
    config.plugins.delete('preload')
    config.plugins.delete('prefetch')

    config.output.filename('[name].js').chunkFilename('[name].js')

    config.plugin('extract-css').tap(args => {
      args[0].filename = '[name].css'
      args[0].chunkFilename = '[name].css'
      return args
    })

    const { templateParameters, minify } = config
      .plugin('html')
      .store.get('args')[0]
    config.plugins.delete('html')

    config.entry('background').add(api.resolve('src/background'))

    fs.readdirSync(api.resolve('src/contents')).forEach(name => {
      config.entry(`contents/${name}`).add(api.resolve(`src/contents/${name}`))
    })

    const htmlPath = api.resolve('public/index.html')
    fs.readdirSync(api.resolve('src/pages')).forEach(name => {
      const entry = `pages/${name}`
      config.entry(entry).add(api.resolve(`src/pages/${name}`))
      config.plugin(`html-${name}`).use(HTMLPlugin, [
        {
          templateParameters,
          minify,
          chunks: [entry],
          template: htmlPath,
          filename: `${entry}.html`
        }
      ])
    })

    if (argv.fastbuild) {
      config.plugins.delete('fork-ts-checker')
      config.plugins.delete('optimize-css')
      config.delete('optimization')
    }
  }
}

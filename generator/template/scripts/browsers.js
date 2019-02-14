const fs = require('fs')
const path = require('path')

module.exports = fs
  .readdirSync(path.join(__dirname, '../src/manifest'))
  .map(name => (/^(\S+)\.manifest\./.exec(name) || ['', ''])[1])
  .filter(name => name && name !== 'common')

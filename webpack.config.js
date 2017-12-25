const path = require('path')

module.exports = {
  entry: {
    background: './add-on/background/main.js',
    content: './add-on/content/main.js'
  },

  output: {
    path: path.resolve(__dirname, 'add-on'),
    filename: '[name].js'
  }
}
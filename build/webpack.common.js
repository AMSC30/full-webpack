const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const resolve = p => path.resolve(__dirname, '../src', p)

module.exports = {
  entry: {
    index: resolve('index.js')
  },

  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js',
    clean: true
  },
  externals: {
    lodash: {
      commonjs: 'lodash',
      commonjs2: 'lodash',
      amd: 'lodash',
      root: '_'
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Test Webpack',
      filename: 'template.html'
    })
  ]
}

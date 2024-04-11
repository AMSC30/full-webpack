const webpack = require('./src/webpack')
const config = require('./build/webpack.dev.js')

const compiler = webpack(config)

compiler.run((err, stats) => {
  if (err) {
    console.error(err)
  } else {
    console.log(stats)
  }
})

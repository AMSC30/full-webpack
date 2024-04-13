const webpack = require('./src/webpack')
const config = require('./build/webpack.dev.js')

const compiler = webpack(config, (error, status) => {
  if (error) {
    console.log(error)
    return
  }
  console.log(status)
})

// compiler.run((err, stats) => {
//   if (err) {
//     console.error(err)
//   } else {
//     console.log(stats)
//   }
// })

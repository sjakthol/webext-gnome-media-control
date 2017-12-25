if (process.env.NODE_ENV === 'production') {
  module.exports = () => {}
} else {
  module.exports = console.log
}

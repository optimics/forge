module.exports = {
  configs: {
    recommended: {
      plugins: ['optimics'],
      rules: {
        'optimics/boolean-shortcuts': 'error',
      }
    }
  },
  rules: {
    'boolean-shortcuts': require('./rules/boolean-shortcuts.js'),
  }
}

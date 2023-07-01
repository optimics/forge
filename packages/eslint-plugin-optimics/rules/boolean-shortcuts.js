const replace = (node, replacement) => (fixer) =>
  fixer.replaceText(node, replacement)

module.exports = {
  meta: {
    type: 'suggestion',
    fixable: true,
    docs: {
      description: 'disable boolean saving',
      recommended: false,
    },
    messages: {
      bangNone: 'Use true to express boolean value instead of "!0"',
      bangOne: 'Use false to express boolean value instead of "!1"',
      falseBang: 'Use true to express boolean value instead of "!false"',
      trueBang: 'Use false to express boolean value instead of "!true"',
    },
  },
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator === '!') {
          if (node.argument.value === 1) {
            context.report({
              node,
              messageId: 'bangOne',
              fix: replace(node, 'false'),
            })
          }
          if (node.argument.value === 0) {
            context.report({
              node,
              messageId: 'bangNone',
              fix: replace(node, 'true'),
            })
          }
          if (node.argument.value === true) {
            context.report({
              node,
              messageId: 'trueBang',
              fix: replace(node, 'false'),
            })
          }
          if (node.argument.value === false) {
            context.report({
              node,
              messageId: 'falseBang',
              fix: replace(node, 'true'),
            })
          }
        }
      },
    }
  },
}

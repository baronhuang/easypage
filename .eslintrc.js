module.exports = {
  parser: 'babel-eslint', // 让eslint识别babel
  "extends": [
    'eslint:recommended',
    "standard"
  ],
  "env": {
    "browser": true,
    "es6": true,
    jquery: true
  },
  parserOptions: {
    sourceType: 'module',
  },
  /**
   * "off" 或 0 - 关闭规则
   * "warn" 或 1 - 开启规则，使用警告级别的错误：warn (不会导致程序退出),
   * "error" 或 2 - 开启规则，使用错误级别的错误：error (当被触发的时候，程序会退出)
   */
  "rules": {
    "no-console": 0,  // 禁用 console
    "no-debugger": 0, // 禁用debugger
    "semi": ["error", "always"],  // 要求分号
    "no-eval": 0, // 禁用 eval()
    "no-unused-expressions": ["error", { "allowTernary": true, "allowShortCircuit": true }],  // 禁止未使用过的表达式
    "no-throw-literal": 0 // 限制可以被抛出的异常
  }
};

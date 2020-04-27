
module.exports = {
  'presets': [
    [
      '@babel/preset-env',
      {
        // 'corejs': 3,
        // 'useBuiltIns': 'usage',
        'modules': false
        // 'targets': {
        //   'browsers': [
        //     'ie >=9',
        //     'last 2 version',
        //     '> 5%',
        //     'not dead'
        //   ]
        // }
      }
    ]
  ],
  'plugins': [
    // ['@babel/plugin-transform-runtime'],
    // ['@babel/plugin-proposal-decorators', { legacy: true }],
    // ['@babel/plugin-proposal-class-properties', { loose: true }]
  ]
};

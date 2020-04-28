const path = require('path');
const webpack = require('webpack');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const resolve = dir => path.join(__dirname, '.', dir);
const isDev = process.env.NODE_ENV === 'development';

const plugins = isDev ? [
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NamedModulesPlugin(),
  new webpack.NoEmitOnErrorsPlugin()
] : [
  new TerserWebpackPlugin({
    parallel: true,
    terserOptions: {
      compress: {
        warnings: false
      },
      mangle: true
    },
    sourceMap: true
  }),
  // 分析构建后的js
  new BundleAnalyzerPlugin({
    analyzerMode: 'disabled', // 不启动展示打包报告的http服务器
    statsFilename: '_bundle_stats.json', // 文件名
    generateStatsFile: true // 是否生成stats.json文件
  })
];

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: {
    index: './src/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'), // 必须是绝对路径
    filename: '[name].js', // 输出文件
    libraryTarget: 'umd', // 采用通用模块定义
    library: '@koicarp/easypage', // 库名称
    libraryExport: 'default' // 兼容 ES6(ES2015) 的模块系统、CommonJS 和 AMD 模块规范
    // globalObject: 'this' // 兼容node和浏览器运行，避免window is not undefined情况
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(js)$/,
        loader: 'eslint-loader',
        enforce: 'pre',
        include: [resolve('src')],
        options: {
          formatter: require('eslint-formatter-friendly')
        }
      },
      {
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: /node_modules/ // 排除 node_modules 目录
      }
      // {
      //   test: /\.css$/,
      //   use: ['style-loader', 'css-loader']
      // }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    ...plugins
  ]
};

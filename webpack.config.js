module.exports = {
  entry: {
    web: './src/web.js'
  },
  output: {
    filename: '[name].bundle.js'
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  'env',
                  {
                    'targets': {
                      'safari': 11
                    },
                    'useBuiltIns': true
                  }
                ]
              ],
              plugins: ['babel-plugin-lajure']
            }
          }
        ]
      }
    ]
  }
};

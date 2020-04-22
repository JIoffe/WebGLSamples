const path = require('path');

module.exports = [
  {
    entry: './js/main.js',
    output: {
      filename: 'bundle.min.js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [
    ],
    mode: 'development'
  }
];
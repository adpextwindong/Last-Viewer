const path = require('path');

module.exports = {
	  entry: './js/app.js',
	  output: {
		      path: path.resolve(__dirname, '.'),
		      filename: '[name].bundle.js',
		  	chunkFilename: '[name].bundle.js',
			},
	mode: 'development'
};

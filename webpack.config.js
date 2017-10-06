const path = require('path');
//const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
process.traceDeprecation = true
var ProvidePlugin = require('webpack/lib/ProvidePlugin');


module.exports = {
  entry: './app/javascripts/app.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'app.js'
  },
  	  /* resolve: {
  modules: [
    path.join(__dirname, "./app/vendor"),
    "node_modules"
  ]
}, */
plugins: [
    // Copy our app's index.html to the build folder.
    new CopyWebpackPlugin([
      { from: './app/index.html', to: "index.html" },
    ]),
	new ProvidePlugin({
           $: "jquery",
           jQuery: "jquery"
       })
  ],
	
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
		/*include: [
    path.resolve(__dirname, "./app/vendor/"),
    path.resolve(__dirname, "./app/vendor/bootstrap-3.3.7-dist/js/")
  ], */
        query: {
          presets: ['es2015'],
          plugins: ['transform-runtime']
        }
      },
	  
      {
       test: /\.css$/,
       use: [ 'style-loader', 'css-loader' ]
      },
      { test: /\.json$/, use: 'json-loader' },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: [ 'url-loader?limit=10000&mimetype=application/font-woff' ]
      }, 
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: [ 'file-loader' ]
      },
	  
	   /*{
        test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        loader: 'file-loader?limit=20000'
      }, */
	  
	  /*{
  test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
  loader: 'file-loader',
}, */

	  
	 /*{
              test: /\.(png|jpg|jpeg|woff|woff2|eot|ttf|svg)(\?.*$|$)/,
              loader:'url-loader?limit=20000'
 }, */
 
 /*{ test: /\.(png|jpg|jpeg|woff|woff2|eot|ttf|svg)(\?\S*)?$/
, loader: 'url-loader?limit=20000&mimetype=application/font-woff&name=[name].[ext]'
},  */


/*{test: /\.(jpe?g|png|woff|woff2|eot|ttf|svg)(\?[a-z0-9=.]+)?$/, loader: 'url-loader?limit=20000'}, */

/*{ test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&mimetype=application/font-woff" }, */
/*{
    test: /\.(eot|woff|woff2|ttf|svg|png|jpg)$/,
    loader: 'url-loader?limit=30000&name=[name]-[hash].[ext]'
},
      { test: /\.(jpe|jpg|woff|woff2|eot|ttf|svg)(\?.*$|$)/, loader: "file-loader?limit=20000&name=[name]-[hash].[ext]" }, */

/*{
      test: /\.ttf(\?v=\d+\.\d+\.\d+)(\?.*$|$)/,
      loader: "url-loader?limit=10000&mimetype=application/octet-stream"
    }, {
      test: /\.eot(\?v=\d+\.\d+\.\d+)(\?.*$|$)/,
      loader: "file-loader"
    }, */
 
 
	   { test: /app\/vendor\/.+\.(jsx|js)$/, loader: 'imports-loader?jQuery=jquery,$=jquery,this=>window' } ,
	   { test: /app\/vendor\/bootstrap.+\/js\/.+\.(jsx|js)$/, loader: 'imports-loader?jQuery=jquery,$=jquery,this=>window' } ,
    ]
  }
}
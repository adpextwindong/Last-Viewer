echo "Sassing style.scss into style.css"
sass css/style.scss css/style.css
echo "Building bundle.js"
npx webpack --config webpack.config.js --devtool source-map

#Browserify has been deprecated due to import/require syntax issues
#browserify js/app.js -o bundle.js --d

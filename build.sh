echo "Sassing style.scss into style.css"
sass css/style.scss css/style.css
echo "Building bundle.js"
browserify js/app.js -o bundle.js --d

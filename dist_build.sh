echo "Building bundle.js"
browserify js/app.js -o bundle.js

echo "Cleaning dist folder"
rm -rf dist/

echo "Copying project files to dist/"

mkdir -p dist/data
mkdir -p dist/js
mkdir -p dist/css
cp -r data/ dist/
cp -r js/ dist/
cp -r css/ dist/

cp foot_viewer.html dist/index.html
cp bundle.js dist/

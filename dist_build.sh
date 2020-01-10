echo "Building bundle.js"
browserify js/app.js -o bundle.js

echo "Cleaning dist folder"
rm -rf dist/

echo "Copying project files to dist/"

mkdir -p dist/data
mkdir -p dist/css
mkdir -p dist/lib
cp -r data/ dist/
cp -r css/ dist/
cp -r lib/ dist/

cp foot_viewer.html dist/index.html
cp bundle.js dist/

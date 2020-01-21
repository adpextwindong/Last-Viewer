rm *.bundle.js*
echo "Running build script"
./build.sh

echo "Cleaning dist folder"
rm -rf dist/

echo "Copying project files to dist/"

mkdir -p dist/data
mkdir -p dist/css
mkdir -p dist/lib
mkdir -p dist/deps/vue
mkdir -p dist/deps/Three
mkdir -p deps/vue
mkdir -p deps/Three

cp node_modules/three/build/* deps/Three
cp node_modules/vue/dist/* deps/vue

cp -r deps/ dist/
cp -r data/ dist/
cp -r css/ dist/
cp -r lib/ dist/

cp foot_viewer.html dist/index.html
cp *.bundle.js dist/

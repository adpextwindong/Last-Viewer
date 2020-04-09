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
mkdir -p dist/deps/vuex
mkdir -p dist/deps/vue-router
mkdir -p dist/deps/Three
mkdir -p deps/vue
mkdir -p deps/vuex
mkdir -p deps/vue-router
mkdir -p deps/Three

cp node_modules/three/build/* deps/Three
cp node_modules/vue/dist/* deps/vue
cp node_modules/vuex/dist/* deps/vuex
cp node_modules/vue-router/dist/* deps/vue-router
cp vue.min.js deps/vue/vue.min.js

cp -r deps/ dist/
cp -r data/ dist/
cp -r css/ dist/
cp -r lib/ dist/

cp foot_viewer.html dist/index.html
cp *.bundle.js dist/

Install Node.js v12.x:
For Ubuntu
    `curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -`
    `sudo apt-get install -y nodejs`

Current requirements:
Vuejs
Node.js
Node.npm Package Manager (NPM)
Webpack (installable through NPM)
SASS for SCSS (installable through NPM)
`npm -g install sass`
NPM packages listed in package.json

Installing package.json dependencies
`npm install`

Running the viewer locally
`python -m http.server` for python 3
`python -m SimpleHTTPServer` for python 2

Build process:

    Building the stylesheet from the scss.
    `sass css/style.scss css/style.css`

    Compiling the Vue app into the bundle.js files.
    `npx webpack --config webpack.config.js --devtool source-map`

build.sh handles these two steps for local development.

dist_build.sh prepares a dist/ folder for uploading to a server.


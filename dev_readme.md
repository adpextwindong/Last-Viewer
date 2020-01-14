Current requirements:
Vuejs
Node.npm Package Manager (NPM)
Browserify (installable through NPM)
NPM packages listed in package.json
SASS for SCSS

Running the viewer locally
`python -m http.server`

Build process:

    Building the stylesheet from the scss.
    `sass css/style.scss css/style.css`

    Compiling the Vue app into the bundle.js file.
    `browserify js/app.js -o bundle.js`


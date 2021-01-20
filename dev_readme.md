Install Node.js v12.x:
For Ubuntu
    `curl -sL https://deb.nodesource.com/setup_15.x | sudo -E bash -`
    `sudo apt-get install -y nodejs`

SEE vm_bootstrap.sh for more details on setting up an Ubuntu enviroment.

Current requirements:
@vue/cli

Everything else is handled by package.json.

Such as:
    Vuejs
    Node.js
    Node.npm Package Manager (NPM)
    Webpack (installable through NPM)
    SASS for SCSS (installable through NPM)
    `npm -g install sass`

Installing package.json dependencies
`npm install`

Running the viewer locally
`python -m http.server` for python 3
`python -m SimpleHTTPServer` for python 2

Build process:

    npm run build; //Builds everything into the dist folder.
    npm run serve; //This runs a development server with code compile on save & linting.

    Building the stylesheet from the scss manually.
    `sass src/assets/css/style.scss src/assets/css/style.css`

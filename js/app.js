const Vue = require('../node_modules/vue/dist/vue.js');
var Viewer = require('./viewer.js');
var appViewer = new Viewer();
var THREE = require('three');
var OBJLoader = require('./lib/vendor/three_loader_custom');
OBJLoader(THREE);


const AppStates = Object.freeze({
    PICKING:   Symbol("picking"),
    LOADING:  	Symbol("loading"),
    LOADED: 	Symbol("loaded")
	});


const sleep = m => new Promise(r => setTimeout(r, m))

var app = new Vue({
    el: '#app',
    data: {

        //TODO make this actually point to fetched scans
        scans: [
        { path: './data/foot1.obj' },
        { path: './data/foot2.obj' },
        { path: './data/foot3.obj' }
        ],

        AppStates : AppStates,
        AppState : null,
    },
    methods : {

        //TODO replace this with an async load call to loadOBJ
        //TODO probably should be async
        async loadViewer (path) {
            console.log("recieved click for path " + path);
            this.AppState = AppStates.LOADING;
            //TODO Spruce up the css for the loadscreen
            console.log("now loading...");

            await sleep(1);

            var loader = new THREE.OBJLoader();
            var appScope = this;
            loader.load(path, function(response_obj){
                    console.log("loaded");
                    appScope.AppState = AppStates.LOADED;
                    appViewer.viewer.stashLoadedObj(response_obj);
                    appViewer.viewer.init(appScope.$el, response_obj);
                    appViewer.viewer.animateLoop();
                }
            )
        },

        //TODO this is really ugly to expose it through the Vue controls. Might be less of a pain when through a component for the Viewer.
        resetCamera () {
            appViewer.viewer.resetCamera();
        },

        //It might be easier to just object.add method to this class during an init phase from a list of methods or something.
        hideLandmarks () {
            appViewer.viewer.hideLandmarks();
        }
    },

    //TODO is this necessary?
    created : function() {
        Object.freeze(this.AppStates);
        this.AppState = this.AppStates.PICKING;
    }

})

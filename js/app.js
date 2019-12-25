const Vue = require('../node_modules/vue/dist/vue.js');
Vue.component('viewer', require('./components/viewer_layout.js'));

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
        async loadViewer (path) {
            console.log("recieved click for path " + path);
            this.AppState = AppStates.LOADING;
            //TODO Spruce up the css for the loadscreen
            console.log("now loading...");

            await sleep(1);

            var loader = new THREE.OBJLoader();
            var appScope = this;
            loader.load(path, function(response_text_obj_pair){
                    console.log("loaded");
                    appScope.AppState = AppStates.LOADED;
                    appScope.$refs.viewerInstance.launchViewer(appScope.$el, response_text_obj_pair);
                }
            )
        },
    },

    created : function() {
        //Initialize AppState
        this.AppState = this.AppStates.PICKING;
    }

})

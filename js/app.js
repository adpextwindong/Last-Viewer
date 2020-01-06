const Vue = require('../node_modules/vue/dist/vue.js');
Vue.component('viewer', require('./components/viewer_layout.js'));
Vue.component('landmark_list', require('./components/landmark_list.js'));

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
        { path: './data/foot.obj' },
        { path: './data/foot1.obj' },
        { path: './data/foot2.obj' },
        { path: './data/foot3.obj' },
        ],
        selectedScans : [],

        AppStates : AppStates,
        AppState : null,
    },
    methods : {
        async loadViewer (paths) {
            console.log("recieved click for path " + paths);
            this.AppState = AppStates.LOADING;
            //TODO Spruce up the css for the loadscreen
            console.log("now loading...");

            await sleep(1);

            var loader = new THREE.OBJLoader();
            var appScope = this;

            let loadList = [];
            //Refactor turn this into an awaitable promise so we dont have to wait loop bellow.
            paths.forEach(p => {
                    loader.load(p, function(response_text_obj_pair){
                        console.log("loaded");
                        loadList.push(response_text_obj_pair);
                    }
                )
            });
            //TODO REFACTOR FIXME
            while(loadList.length != paths.length){
                await sleep(100);
            }
            appScope.AppState = AppStates.LOADED;
            appScope.$refs.viewerInstance.launchViewer(appScope.$el, loadList);
        },
    },

    created : function() {
        //Initialize AppState
        this.AppState = this.AppStates.PICKING;
    }

})

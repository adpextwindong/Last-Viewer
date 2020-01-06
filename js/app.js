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
        { path: './data/foot1.obj' },
        { path: './data/foot2.obj' },
        { path: './data/foot3.obj' },
        ],
        insoles: [
            { path: './data/sole.obj' },
        ],
        selectedScans : [],
        selectedInsoles : [],

        AppStates : AppStates,
        AppState : null,
    },
    methods : {
        async loadViewer (scan_paths, insole_paths) {
            //TODO BUGFIX assert scan_paths and insole_paths together are not empty, enforce validation of button on
            //selection menu as well

            this.AppState = AppStates.LOADING;
            console.log("now loading...");

            await sleep(1);

            var loader = new THREE.OBJLoader();
            var appScope = this;

            let loadList = [];
            //Refactor turn this into an awaitable promise so we dont have to wait loop bellow.
            scan_paths.forEach(p => {
                    loader.load(p, function(response_text_obj_pair){
                        console.log("loaded");
                        response_text_obj_pair["MODEL_TYPE"] = "SCAN";
                        loadList.push(response_text_obj_pair);
                    }
                )});
            insole_paths.forEach(p => {
                loader.load(p, function(response_text_obj_pair){
                    console.log("loaded");
                    response_text_obj_pair["MODEL_TYPE"] = "INSOLE";
                    loadList.push(response_text_obj_pair);
                }
            )});
            //TODO REFACTOR FIXME

            while(loadList.length !== (scan_paths.length + insole_paths.length)){
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

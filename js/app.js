const Vue = require('../node_modules/vue/dist/vue.js');
Vue.component('viewer', require('./components/viewer_layout.js'));
Vue.component('landmark_list', require('./components/landmark_list.js'));

var THREE = require('three');
var OBJLoader = require('./lib/vendor/three_loader_custom');
OBJLoader(THREE);
var LoadGraph = require('./loader/load_graph_helper.js')

const AppStates = Object.freeze({
    PICKING:   Symbol("picking"),
    LOADING:  	Symbol("loading"),
    LOADED: 	Symbol("loaded")
	});


const sleep = m => new Promise(r => setTimeout(r, m))

//Careful theres no validation on this
const LoadGraphFromObject = o => {
    let children = o.overlay_children ? o.overlay_children.map(LoadGraphFromObject) : undefined;
    return new LoadGraph(o.name, o.path, o.type, children, o.config);
}
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

        existing_load_schemes: [
            [{
            name: "foot1 and sole",
            type: "FOOT",
            path: "./data/foot1.obj",
            config : {
                rotation : {
                    x: -90*Math.PI/180,
                    y: 0,
                    z: -90*Math.PI/180
                },
            },
            overlay_children: [{
                    type: "INSOLE",
                    path: "./data/sole.obj",
                    config: {
                        position : {
                            x: 30,
                            y: 20,
                            z: -10
                        },
                        material_color : 0x00FF00,
                    }
                }],
            }]
        ],

        selectedScans : [],
        selectedInsoles : [],
        selectedSchemes : [],

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

            let loadList = [];
            //Refactor turn this into an awaitable promise so we dont have to wait loop bellow.
            scan_paths.forEach((path,index) => {
                    loader.load(path, function(response_text_obj_pair){
                        console.log("loaded");
                        response_text_obj_pair["MODEL_TYPE"] = "FOOT";
                        response_text_obj_pair.obj["name"] = "foot" + index;

                        loadList.push({
                            response_object: response_text_obj_pair
                        });
                    }
                )});
            insole_paths.forEach((path, index) => {
                loader.load(path, function(response_text_obj_pair){
                    console.log("loaded");
                    response_text_obj_pair["MODEL_TYPE"] = "INSOLE";
                    response_text_obj_pair.obj["name"] = "insole" + index;

                    loadList.push({
                        response_object: response_text_obj_pair
                    });
                }
            )});

            while(loadList.length !== (scan_paths.length + insole_paths.length)){
                await sleep(100);
            }

            var appScope = this;
            appScope.AppState = AppStates.LOADED;
            appScope.$refs.viewerInstance.launchViewer(appScope.$el, loadList);
        },

        async loadGraphViewer (loadGraphListRawObject) {
            let loadGraphList = loadGraphListRawObject.map(LoadGraphFromObject);

            this.AppState = AppStates.LOADING;
            console.log("now loading...");

            await sleep(1);

            var loader = new THREE.OBJLoader();
            
            // TODO notLoaded predicate should be exposed
            loadGraphList.forEach(loadGraph => loadGraph.startLoadOBJS(loader));
            while(loadGraphList.some(g => g.load_state !== "LOADED" )){
                await sleep(100);
                loadGraphList.filter(g => g.load_state !== "LOADED").forEach(g => g.updateBasedOnAwaitingChildren());
            }

            //graph.stitchSubSceneGraph
            loadGraphList.forEach(g => g.stitchSceneGraph());

            var appScope = this;
            appScope.AppState = AppStates.LOADED;
            appScope.$refs.viewerInstance.launchViewer(appScope.$el, loadGraphList);
        }
    },

    created : function() {
        //Initialize AppState
        this.AppState = this.AppStates.PICKING;
    }

})

const Vue = require('../node_modules/vue/dist/vue.js');
Vue.component('viewer', require('./components/viewer_layout.js'));
Vue.component('landmark_list', require('./components/landmark_list.js'));
Vue.component('scene_graph_hiearchy', require('./components/scene_graph_hiearchy.js'));

var THREE = require('three');
var OBJLoader = require('../lib/vendor/three_loader_custom');
OBJLoader(THREE);
var LoadGraph = require('./loader/load_graph_helper.js')

const AppStates = Object.freeze({
    PICKING:   Symbol("picking"),
    LOADING:  	Symbol("loading"),
    LOADED: 	Symbol("loaded")
	});


const sleep = m => new Promise(r => setTimeout(r, m))

//Careful theres no validation on this
const LoadGraphFromObject = (o) => {
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
            name: "foot1",
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
                    name: "sole",
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
            let loadGraphList = [];

            scan_paths.forEach((path, index) => {
                loadGraphList.push(new LoadGraph( "foot" + index , path, "FOOT"));
            })
            insole_paths.forEach((path, index) => {
                loadGraphList.push(new LoadGraph( "insole" + index , path, "INSOLE"));
            })

            this.loadGraphViewer(loadGraphList);
        },

        async loadGraphViewer (loadGraphListRawObject) {
            let loadGraphList = loadGraphListRawObject.map(LoadGraphFromObject);

            this.AppState = AppStates.LOADING;
            console.log("now loading...");

            await sleep(1);

            //TODO this needs to be replaced with a totally async web worker based loader so it doesnt load things in serial
            var loader = new THREE.OBJLoader();
            
            loadGraphList.forEach(loadGraph => loadGraph.startLoadOBJS(loader));
            while(loadGraphList.some(g => g.notLoaded())){
                await sleep(100);
                loadGraphList.filter(g => g.notLoaded()).forEach(g => g.updateBasedOnAwaitingChildren());
            }

            loadGraphList.forEach(g => {
                g.stitchSceneGraph();
                g.applyConfig();
            });

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

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

        existing_load_schemes: [
            [{
            name: "foot1 and sole",
            type: "FOOT",
            path: "./data/foot1.obj",
            overlay_children: [{
                    type: "INSOLE",
                    path: "./data/sole.obj"
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
            var appScope = this;

            let loadList = [];
            //Refactor turn this into an awaitable promise so we dont have to wait loop bellow.
            scan_paths.forEach((path,index) => {
                    loader.load(path, function(response_text_obj_pair){
                        console.log("loaded");
                        response_text_obj_pair["MODEL_TYPE"] = "FOOT";
                        response_text_obj_pair.obj["name"] = "foot" + index;
                        loadList.push(response_text_obj_pair);
                    }
                )});
            insole_paths.forEach((path, index) => {
                loader.load(path, function(response_text_obj_pair){
                    console.log("loaded");
                    response_text_obj_pair["MODEL_TYPE"] = "INSOLE";
                    response_text_obj_pair.obj["name"] = "insole" + index;
                    loadList.push(response_text_obj_pair);
                }
            )});

            while(loadList.length !== (scan_paths.length + insole_paths.length)){
                await sleep(100);
            }
            appScope.AppState = AppStates.LOADED;
            appScope.$refs.viewerInstance.launchViewer(appScope.$el, loadList);
        },




        async loadGraphViewer (loadGraphList) {
/* 
            We should treat the initial load as an array of trees. Incase multiple scans would like to be looked at once.
            While the first usecase would be inspecting a single scan or foot & last&||insole tree.
            They might want to display many at once.
            [{
                 type: foot_pair 
                left: {
                    path,
                    overlay_children:[{
                            path,
                            children
                        },
                    ]
                },
                right:{
                }]
            
            All top level objects should be loaded, positioned in a distributed manner with overlay_children objs loaded
             as children in the scene graph.
            
            Another example is inspecting a last
            [
                {
                    type: last,
                    path,
                    __load_stash:{ //Property that gets appeneded by loader. Used by subsequent stages
                         load_state
                         landmarks,
                         obj
                     },
                    overlay_children[], //Recurse on overlay_children
            
            
                    //Optional
                    config:{
                        //Details for the engine to setup
                        //scene construction details such as how they should be positioned relative to parent?
                        relative_position
                        relative_rotation
                    }
                     
                }
            ]
            Pattern match on the foot type. FOOT/LAST/INSOLE/FOOT_PAIR{LEFT,RIGHT}/LAST_PAIR{LEFT,RIGHT}/INSOLE_PAIR{LEFT,RIGHT}
            

            Traverse the tree and asyncly load all the paths to an "obj" property in the object.
            Recurse on children
            Ideally this schema can be promoted to its own javascript class so all the files can reference it
 */
            this.AppState = AppStates.LOADING;
            console.log("now loading...");

            await sleep(1);

            var loader = new THREE.OBJLoader();
            var appScope = this;

            //Stitching the object graph together will have to wait for all responses to come back
            //async await here would be really nice
            const startLoadOBJS = async loadGraph => {
                loadGraph.load_state = "PENDING";

                loader.load(loadGraph.path, function(response_text_obj_pair){
                    response_text_obj_pair["MODEL_TYPE"] = loadGraph.type;
                    response_text_obj_pair.obj["name"] = loadGraph.name;
                    loadGraph.response_obj = response_text_obj_pair;
                    
                    if(loadGraph.overlay_children){
                        loadGraph.load_state = "AWAITING CHILDREN";
                        loadGraph.overlay_children.forEach(child_load_graph => startLoadOBJS(child_load_graph));
                    }else{
                        loadGraph.load_state = "LOADED";
                    }
                });
            }
            //TODO FIXME, doesnt handle errors right now.
            const updateBasedOnAwaitingChildren = g => {
                if(g.load_state === "AWAITING CHILDREN"){
                    if(g.overlay_children.some(g => g.load_state === "PENDING") === false){
                        g.load_state = "LOADED";
                    }else{
                        g.overlay_children.forEach(child => updateBasedOnAwaitingChildren(child));
                    }
                }
            }

            loadGraphList.forEach(loadGraph => startLoadOBJS(loadGraph));
            while(loadGraphList.some(g => g.load_state !== "LOADED" )){
                await sleep(200);
                loadGraphList.filter(g => g.load_state !== "LOADED").forEach(g => updateBasedOnAwaitingChildren(g));
            }

            //Handles calling all THREE OBJECT3D.add calls throughout the graph so the engine can just add the top level groups
            const stitchSceneGraph = graph => {
                if(graph.overlay_children){
                    graph.overlay_children.forEach(child => {
                        graph.response_obj.obj.add(child.response_obj.obj);
                        stitchSceneGraph(child);
                    })
                }
            }
            loadGraphList.forEach(g => stitchSceneGraph(g));

            appScope.AppState = AppStates.LOADED;
            appScope.$refs.viewerInstance.launchViewer_new(appScope.$el, loadGraphList);
        }
    },

    created : function() {
        //Initialize AppState
        this.AppState = this.AppStates.PICKING;
    }

})

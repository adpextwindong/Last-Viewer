//TODO edit the dist script

var LoadGraph;
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

Vue.component('viewer', () => import('./components/viewer_layout'));
//These imports could be moved down and asyncly done from viewer probably
Vue.component('vue-context', () => import('vue-context'));
Vue.component('landmark_list', () => import('./components/landmark_list'));
Vue.component('scene_graph_hiearchy', () => import('./components/scene_graph_hiearchy'));

var app = new Vue({
    el: '#app',
    data: {

        //TODO make this actually point to fetched scans
        scans: [
        { path: './data/foot1.obj' },
        { path: './data/foot2.obj' },
        { path: './data/foot3.obj' },
        { path: './data/landmark.obj'},
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
            }],


            [{
                name: "foot",
                type: "FOOT",
                path: "./data/201708031726l.obj",
                config :{
                    position : {
                        x: 0,
                        y: 0,
                        z: 0,
                    }
                },
                overlay_children: [{
                    name: "last",
                    type: "LAST",
                    path: "./data/tschiyama_last.obj",
                    config :{
                        position : {
                            x: 0,
                            y: 0,
                            z: 0,
                        }
                    },
                }]
            }],
            
            [{
                name: "foot",
                type: "FOOT",
                path: "./data/201708031726l_reformed.obj",
                config :{
                    position : {
                        x: 0,
                        y: 0,
                        z: -18,
                    }
                },
                overlay_children: [{
                    name: "last",
                    type: "LAST",
                    path: "./data/tschiyama_last.obj",
                    config :{
                        position : {
                            x: 0,
                            y: 0,
                            z: 18,
                        }
                    },
                }]
            }]
        ],

        selectedScans : [],
        selectedInsoles : [],
        selectedSchemes : [],

        AppStates : AppStates,
        AppState : null,
    },
    methods : {
        WebGLAvailible(){
            return window.WebGLRenderingContext !== undefined;
        },


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

            //This is a hack around v-if rendering and the mounted lifecycle of the viewer component.
            //If there was any way to wait for the render to complete this could be refactored.
            this.launchViewerCallback = function(){
                appScope.$refs.viewerInstance.launchViewer(appScope.$el, loadGraphList);
            };
        }
    },

    created : function() {
        //Initialize AppState
        this.AppState = this.AppStates.PICKING;
    },
    mounted : function() {
        import('../lib/vendor/three_loader_custom').then(OBJLoader => {
            OBJLoader.default(THREE);
        });
        import('./loader/load_graph_helper').then(m => LoadGraph = m.default);
    }

})

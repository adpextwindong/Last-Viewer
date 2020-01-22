const LoadGraph = require('../loader/load_graph_helper');

//Careful theres no validation on this
const LoadGraphFromObject = (o) => {
    let children = o.overlay_children ? o.overlay_children.map(LoadGraphFromObject) : undefined;
    return new LoadGraph(o.name, o.path, o.type, children, o.config);
}

const sleep = m => new Promise(r => setTimeout(r, m))

export default {
    template : `
    <div class="scan_picker">
        <div v-if="loading===false">
            <ul >
                <span>Scans avalible for viewing:</span>
                <li v-for="scan in scans">
                    <input type="checkbox" :id="scan" :value="scan.path" v-model="selectedScans">
                    <label for="scan">{{scan.path}}</label>
                </li>
                <span>Insoles avalible for viewing:</span>
                <li v-for="sole in insoles">
                    <input type="checkbox" :id="sole" :value="sole.path" v-model="selectedInsoles">
                    <label for="sole">{{sole.path}}</label>
                </li>
                <!-- There should be some validation on this end that confirms a scan has been selected -->
                <button type="button" v-on:click="loadViewer(selectedScans, selectedInsoles)">Load selected scans</button>
            </ul>

            <div>
                <span>Overlay Scene Graph Viewer:</span>
                <li v-for="scheme in existing_load_schemes">
                    <button type="button" v-on:click="loadGraphViewer(scheme)">{{scheme}}</button>
                </li>						
            </div>
        </div>
        <div v-else class="loading_screen">
            now loading...
        </div>

    </div>
    `,
    props: ['loaderGraphsSetter'],
    name: 'scan_selector',
    mounted : function() {
        import('../../lib/vendor/three_loader_custom').then(OBJLoader => {
            OBJLoader.default(THREE);
        });
    },
    //We need some sort of handle to loadViewer or loadGraphViewer and the router
    data() {
        return {
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
      
            loading : false,
        }
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

            //TODO stash the loadgraph list

            // this.loadGraphViewer(loadGraphList);
            this.loaderGraphsSetter(loadGraphList);
        },

        async loadGraphViewer (loadGraphListRawObject) {
            let loadGraphList = loadGraphListRawObject.map(LoadGraphFromObject);

            console.log("now loading...");
            this.loading = true;
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

            this.loading = false;
            this.loaderGraphsSetter(loadGraphList);
            this.$router.push('engine');
        }

    }
}
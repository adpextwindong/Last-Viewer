const LoadGraph = require('../loader/load_graph_helper');

//Careful theres no validation on this
const LoadGraphFromObject = (o) => {
    let children = o.overlay_children ? o.overlay_children.map(LoadGraphFromObject) : undefined;
    return new LoadGraph(o.name, o.path, o.type, children, o.config);
}

const sleep = m => new Promise(r => setTimeout(r, m))

export default {
    //TODO locales
    locales : {
        en: {
            "Scans avalible for viewing" : "Scans avalible for viewing",
            "Insoles avalible for viewing": "Insoles avalible for viewing",
        },
        jp: {
            "Scans avalible for viewing" : "あるスカン",
            "Insoles avalible for viewing": "あるインソール",
            'Load selected scans': "LOAD !TODO",
            'now loading': "now loading !TODO",
            'Overlay Scene Graph Viewer' : "overlay viewer !TODO"
        },
    },
    template : `
    <div class="scan_picker">
        <div v-if="loading===false">
            <ul >
                <span>{{ t('Scans avalible for viewing') }}:</span>
                <li v-for="scan in scans">
                    <input type="checkbox" :id="scan" :value="scan.path" v-model="selectedScans">
                    <label for="scan">{{scan.path}}</label>
                </li>
                <span>{{ t('Insoles avalible for viewing') }}:</span>
                <li v-for="sole in insoles">
                    <input type="checkbox" :id="sole" :value="sole.path" v-model="selectedInsoles">
                    <label for="sole">{{sole.path}}</label>
                </li>
                <!-- There should be some validation on this end that confirms a scan has been selected -->
                <button type="button" v-on:click="loadViewer(selectedScans, selectedInsoles)">{{ t('Load selected scans') }}</button>
            </ul>

            <div>
                <span>{{t('Overlay Scene Graph Viewer')}}:</span>
                <li v-for="scheme in existing_load_schemes">
                    <button type="button" v-on:click="loadGraphViewer(scheme)">{{scheme}}</button>
                </li>						
            </div>

            <div id="drop_zone" @drop.prevent="fileDropHandler" @dragover.prevent>
                Drag and drop one or more files here.
            </div>
        </div>
        <div v-else class="loading_screen">
            {{t('now loading')}}...
        </div>

    </div>
    `,
    props: ['loaderGraphsSetter'],
    name: 'scan_selector',
    mounted : function() {
        import('../../lib/vendor/three_loader_custom').then(OBJLoader => {
            OBJLoader.default(THREE);
        });

        //TODO remove these when not necessary
        window.addEventListener("dragover",function(e){
            e = e || event;
            e.preventDefault();
          },false);
          window.addEventListener("drop",function(e){
            e = e || event;
            e.preventDefault();
          },false);
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
            this.loadGraphViewer(loadGraphList);
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

            this.stitchAndStartEngine(loadGraphList);
        },

        stitchAndStartEngine(loadGraphList){
            loadGraphList.forEach(g => {
                g.stitchSceneGraph();
                g.applyConfig();
            });

            this.loading = false;
            this.loaderGraphsSetter(loadGraphList);
            this.$router.push('engine');
        },
        async fileDropHandler(ev) {
            console.log('File(s) dropped');
          
            //TODO file validation and error handling

            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();

            var loader = new THREE.OBJLoader();
            let obj_promises = [];
            
            if (ev.dataTransfer.items) {
              // Use DataTransferItemList interface to access the file(s)
              for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                  var file = ev.dataTransfer.items[i].getAsFile();
                  console.log(file);
                  console.log('... file[' + i + '].name = ' + file.name);
                  obj_promises.push({name: file.name, text_p: file.text()});
                }
              }
            }
            
            this.loading = true;
            this.$forceUpdate();
            await sleep(1);

            const texts = await Promise.all(obj_promises.map(o => o.text_p));
            const response_objects = texts.map(txt => loader.parse(txt));
            const loadGraphList = response_objects.map((o,i) => new LoadGraph(obj_promises[i].name, obj_promises[i].name, "FOOT", undefined, undefined, undefined, o));
            console.log("parsed all");

            this.stitchAndStartEngine(loadGraphList);
          }
    }
}
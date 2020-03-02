const LoadGraph = require('../loader/load_graph_helper');

//Careful theres no validation on this
const LoadGraphFromObject = (o) => {
    let children = o.overlay_children ? o.overlay_children.map(LoadGraphFromObject) : undefined;
    return new LoadGraph(o.name, o.path, o.type, children, o.config);
}

var OBJLoader = require('../../lib/vendor/three_loader_custom');
OBJLoader(THREE);

const sleep = m => new Promise(r => setTimeout(r, m))

export default {
    //TODO locales
    locales : {
        en: {
        },
        jp: {
            "Scans avalible for viewing" : "計測データ",
            "Insoles avalible for viewing": "インソール",
            'Load selected scans': "選択したデータを読み込み",
            'now loading': "読込中",

            //Debug
            'Overlay Scene Graph Viewer' : "重ねて表示",

            'Drag and drop one or more files here.': "!TODO",
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
                {{t('Drag and drop one or more files here.')}}
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
        if(typeof REQUEST_METADATA !== "undefined"){
            //We're being passed an ID from php
            console.log(REQUEST_METADATA);
            this.fetchScanForViewer(REQUEST_METADATA);
        }else{
            console.log("Request metadata not found, falling back to old loader");
        }

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
        // This function is ran by the mounted lifecycle method of this component automatically if theres a metadata global object.
        // This will be the entry point for looking at files from the website.
        // The rest of the methods are utilities for testing/development.
        async fetchScanForViewer(metadata){
            let {IIS_id, IIS_signature, IIS_date, key} = metadata;
            let base_url = new URL("https://jp.infoot.net/itouch/service/get_converted_file.php");
            
            base_url.searchParams.set('key',key);
            base_url.searchParams.set('IIS_id',IIS_id);
            base_url.searchParams.set('IIS_signature',IIS_signature);
            base_url.searchParams.set('IIS_date',IIS_date);

            base_url.searchParams.set('type', 'obj');
            base_url.searchParams.set('polygon_size', '2');
            base_url.searchParams.set('digit', '3');

            base_url.href += "&marker";
            base_url.href += "&rotation";

            console.log(base_url);
            let url_left = new URL(base_url.href);

            url_left.href+='&lr=l';

            let url_right = new URL(base_url.href);
            url_right.href+='&lr=r';

            // console.log(url_left);
            // console.log(url_right);
            
            let loadGraphList = [new LoadGraph("Left", url_left.href, "FOOT"),
                                    new LoadGraph("Right", url_right.href, "FOOT")];

            this.loadGraphViewer(loadGraphList);

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

        //Drag and drop load handler
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
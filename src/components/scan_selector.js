const LoadTree = require('../loader/load_tree_helper');

//TODO rename this or something
//Careful theres no validation on this
const LoadTreeFromObject = (o) => {
    let children = o.overlay_children ? o.overlay_children.map(LoadTreeFromObject) : undefined;
    return new LoadTree(o.name, o.path, o.type, children, o.config);
}

const sleep = m => new Promise(r => setTimeout(r, m))

export default {
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

            'Drag and drop one or more files here.': "DEBUG_DRAG_AND_DROP_HERE",
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
                    <button type="button" v-on:click="LoadTreeViewer(scheme)">{{scheme}}</button>
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
    name: 'scan_selector',
    mounted : function() {
        if(typeof REQUEST_METADATA !== "undefined"){
            //We're being passed an ID from php
            console.log(REQUEST_METADATA);
            this.fetchScanForViewer(REQUEST_METADATA);
        }else{
            console.log("Request metadata not found, falling back to old loader");
        }

        //Drag and drop interface will remain for debug purposes.
        window.addEventListener("dragover",function(e){
            e = e || event;
            e.preventDefault();
        },false);
        window.addEventListener("drop",function(e){
            e = e || event;
            e.preventDefault();
        },false);
    },
    
    data() {
        return {
        //For now this list is for debugging/development testing purposes.
            scans: [
                { path: './data/foot1.obj' },
                { path: './data/foot2.obj' },
                { path: './data/foot3.obj' },
                { path: './data/landmark.obj'},
            ],
            insoles: [
                { path: './data/sole.obj' },
            ],
       
            //TODO add scheme naming to these things.
            existing_load_schemes: [
                [{
                    name: "foot_old",
                    type: "FOOT",
                    path: "./data/foot1.obj",
                    overlay_children: [{
                            name: "foot_new",
                            type: "FOOT",
                            path: "./data/foot2.obj",
                            config: {
                                material_color : 0x228B22,
                            }
                        }],
                    }], 
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
            
            let LoadTreeList = [new LoadTree("Left", url_left.href, "FOOT"),
                                    new LoadTree("Right", url_right.href, "FOOT")];

            this.LoadTreeViewer(LoadTreeList);

        },
        //Refactor this name
        async loadViewer (scan_paths, insole_paths) {
            let LoadTreeList = [];

            scan_paths.forEach((path, index) => {
                LoadTreeList.push(new LoadTree( "foot" + index , path, "FOOT"));
            })
            insole_paths.forEach((path, index) => {
                LoadTreeList.push(new LoadTree( "insole" + index , path, "INSOLE"));
            })

            this.LoadTreeViewer(LoadTreeList);
        },

        //Refactor this name
        async LoadTreeViewer (LoadTreeListRawObject) {
            let LoadTreeList = LoadTreeListRawObject.map(LoadTreeFromObject);

            console.log("now loading...");
            this.loading = true;
            await sleep(1);

            //TODO REFACTOR ASYNC LOADER (this needs to be replaced with a totally async web worker based loader so it doesnt load things in serial)
            LoadTreeList.forEach(LoadTree => LoadTree.startLoad());
            while(LoadTreeList.some(g => g.notLoaded())){
                await sleep(100);
                LoadTreeList.filter(g => g.notLoaded()).forEach(g => g.updateBasedOnAwaitingChildren());
            }

            this.stitchAndStartEngine(LoadTreeList);
        },

        //PreCondition: No children in the LoadTreeList are awaiting on children to load.
        stitchAndStartEngine(LoadTreeList){
            LoadTreeList.forEach(g => {
                g.stitchSceneGraph();
                g.applyConfig();
            });

            this.loading = false;
            //CRITICAL SECTION FOR LOADING DUE TO VUEJS V-IF LIMITATIONS
            //component/viewer/viewer_layout.js::mounted() has notes on this.
            this.$store.commit('loadTrees/setTrees', LoadTreeList);
            this.$router.push('engine');
        },

        //Drag and drop load handler
        //TODO conver this to funnel into LoadTreeViewer
        async fileDropHandler(ev) {
            console.log('File(s) dropped');
          
            //TODO file validation and error handling

            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();

            let obj_urls = [];

            if (ev.dataTransfer.items) {
              // Use DataTransferItemList interface to access the file(s)
              for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                // If dropped items aren't files, reject them
                if (ev.dataTransfer.items[i].kind === 'file') {
                  
                    var file = ev.dataTransfer.items[i].getAsFile();
                  console.log(file);
                  console.log('... file[' + i + '].name = ' + file.name);
                  obj_urls.push({name : file.name, path: URL.createObjectURL(file), type: "FOOT"});
                  //TODO These createObjectURLS need to be freed eventually
                }
              }
            }
            
            this.loading = true;
            this.$forceUpdate();
            await sleep(1);

            const awaitedPaths = await Promise.all(obj_urls);
            const awaitedTreeList = awaitedPaths.map((o,i) => new LoadTree(o.name, o.path, o.type));
            
            awaitedTreeList.forEach(LoadTree => LoadTree.startLoad());
            while(awaitedTreeList.some(g => g.notLoaded())){
                await sleep(100);
                awaitedTreeList.filter(g => g.notLoaded()).forEach(g => g.updateBasedOnAwaitingChildren());
            }

            this.stitchAndStartEngine(awaitedTreeList);
          }
    }
}
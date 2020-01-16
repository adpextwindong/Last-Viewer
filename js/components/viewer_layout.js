// This is the Vue Component file for the 3D Viewer.
// Its seperated from the APP
var vueclickaway = require('vue-clickaway');

var Viewer = require('../viewer/viewer_engine.js');
var appViewer = new Viewer();

//from https://gist.github.com/renaudtertrais/25fc5a2e64fe5d0e86894094c6989e10
const zip = (arr, ...arrs) => {
    return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
}

module.exports = {
    mixins: [ vueclickaway.mixin ],
    template : `

    <div id="data_display_wrapper" class="wrapper">
        <div id="landmark_nametag_wrapper">
            <span id="landmark_nametag">{{ landmark_highlighted_name }}</span>
        </div>
        <div v-on-clickaway="away" id="context_menu">
            <p @contextmenu.prevent="$refs.menu.open">
                Right click on me
            </p>

            <vue-context ref="menu">
                <li>
                    <a @click.prevent="")">
                        Option 1
                    </a>
                </li>
                <li>
                    <a @click.prevent="">
                        Option 2
                    </a>
                </li>
            </vue-context>
        </div>

        <div id="data_display" class="wrapper_open" >
            <button type="button" v-on:click="resetCamera()">Reset Camera</button>

            <scene_graph_hiearchy
            v-bind:scene_graph_representation="scene_graph_representation"
            v-bind:engine_interface="engine_interface"
            />

            <div>
                <div v-if="landmark_list_visible === true">
                    <landmark_list v-for="(landmark_group,key,index) in landmarks"
                        v-bind:landmark_group="landmark_group"
                        v-bind:key=index></landmark_list>
                </div>
                <button type="button" v-on:click="hideLandmarks()">Hide all landmarks</button>
            </div>
            
        </div>
        <!-- When the app state transitions to AppStates.LOADED the Viewer will attach its renderer to the DOM -->
        <div id="wrapper_closer" v-on:click="toggleMenu()">
            
        </div>
    </div>
    `,

    //It might be easier for a control object for each component to be generated that contains closures for each thing
    //instead of vbinding everything. Ofc theres no compile time guarentee that the controls match up.
    
    data() {
        return {
            //Refactor for multi objs
            landmarks : {},

            landmark_highlighted : false,
            landmark_highlighted_name : "",
            landmark_list_visible : true,

            scene_graph_representation : [],

            engine_interface : {},
        }
    },
    created() {
        //REFACTOR LANDMARK CODE

        const applyOnExistingLandmark = (parent_key, viewer_group_name, f) => {
            if(this.landmarks[parent_key]){
                let ind = this.landmarks[parent_key].findIndex(element => element.group_name === viewer_group_name);
                if(ind !== -1){
                    f(ind);
                }
            }
        };

        this.$on('viewer_landmark_hover_on', function(parent_key, viewer_group_name){   
            applyOnExistingLandmark(parent_key, viewer_group_name, (ind) =>{
                this.landmarks[parent_key][ind].isActive = true;
                this.$set(this, "landmark_highlighted", true);
                this.landmark_highlighted_name = viewer_group_name + " " + this.landmarks[parent_key][ind].description;
            });
        });
        this.$on('viewer_landmark_hover_off', function(parent_key, viewer_group_name){
            applyOnExistingLandmark(parent_key, viewer_group_name, (ind) =>{
                this.landmarks[parent_key][ind].isActive = false;
                this.$set(this, "landmark_highlighted", false);
                this.landmark_highlighted_name = "";
            });
        });

        this.$on('contextmenu_selected_uuids', function(uuids){
            console.log("Recieved selected uuids for context menu interaction");
            console.log(uuids);
        });
        this.$on('viewer_landmark_highlighted_position', function(hightlighted_position_v2){
            this.lm_nametag_el = document.querySelector("#landmark_nametag_wrapper span");
            this.lm_nametag_el.style["left"] = (hightlighted_position_v2.x + 20) + "px";
            this.lm_nametag_el.style["top"] = (hightlighted_position_v2.y - 20) + "px";
        });

        this.$on('viewer_context_menu_position', function(context_menu_position_v2){
            this.context_menu_active = true;
            this.context_menu_el = document.querySelector('#context_menu');
            this.context_menu_el.style["left"] = (context_menu_position_v2.x + 20) + "px";
            this.context_menu_el.style["top"] = (context_menu_position_v2.y - 20) + "px";
        });
    },

    methods: {
        launchViewer(target_element, processed_loadGraphList) {
            this.__grabLandmarks(processed_loadGraphList);
            let viewer_component_scope = this;
            //This function will be the event emitter handle to the Vue component from the Viewer Engine.
            let viewer_component_event_handle = function (event_name, ...args){
                viewer_component_scope.$emit(event_name, ...args);
                // console.log("Emitted "+event_name+ " event from Viewer Engine");
            };

            appViewer.init(target_element, viewer_component_event_handle, processed_loadGraphList);

            //EVENTS
            this.$set(this, 'scene_graph_representation', processed_loadGraphList.map(g=> g.buildGraphRepresentationModel()));

            //CRITICAL EVENT LAYER
            //This is the event handler that queries the loadGraphList for updates on the scene graph model.
            this.$on('viewer_scene_graph_change', function(){
                console.log("Scene Graph change recieved");
                this.$set(this, 'scene_graph_representation', processed_loadGraphList.map(g=> g.buildGraphRepresentationModel()));
            });

            this.$on('scene_graph_component_remove_uuid_request', function(uuid){
                appViewer.manager_removeUUID(uuid);
            });

            //TODO Refactor RAF loop
            //Starts rendering the scene
            appViewer.animateLoop();

            //Engine interface for controller components
            this.engine_interface = {
                toggleVisibilityUUID : function(uuid){
                    appViewer.manager_toggleVisibility(uuid);
                },
                emitRemoveUUIDRequest: function(uuid){
                    this.$emit('scene_graph_component_remove_uuid_request', uuid);
                }.bind(this),
            };

            //Stashing elements to avoid dom traversals later
            // this.lm_nametag_el = document.querySelector("#landmark_nametag_wrapper span");
            this.menu_display_wrapper_el = document.querySelector("#data_display_wrapper");
            this.menu_wrapper_closer_el = document.querySelector("#wrapper_closer");
        },

        __initLandmarkTexts(parent_key, text){
            this.$set(this.landmarks, parent_key, []);
            //Parses the obj textfile for the landmark descriptions and group names.
            //This assumes all landmark groups are always preceeded by a description line
            //# Pternion     -> Evens
            //g landmark_0   -> Odds
            let xs = text.split('\n').filter(s => s[0] === '#' || s[0] === 'g');//.slice(2);
            let evens = xs.filter((s, ind) => ind % 2 === 0);
            let odds = xs.filter((s, ind) => ind % 2 === 1);
            
            //slice(2) in this case drops the leading "# " and "g " line markers in the obj format

            //landmarks schema
            zip(evens,odds).forEach(ind => {
                this.landmarks[parent_key].push({
                            'description': ind[0] ? ind[0].slice(2) : "",
                            'group_name': ind[1] ? ind[1].slice(2) : "",
                            'isActive': false
                        })
            });   
        },
        __grabLandmarks(processed_loadGraphList){
            const addLandmarks = graph => {
                let {text, obj} = graph.response_object;
                this.__initLandmarkTexts(obj["name"],text);
                if(graph.overlay_children){
                    graph.overlay_children.forEach(child => {
                        addLandmarks(child);
                    })
                }
            }
            processed_loadGraphList.forEach(g => addLandmarks(g));
        },

        //Engine controls for the data display control panel.
        //These functions just expose the Viewer Engine's external interface to the VueJS component at compilation time.
        resetCamera () {
            appViewer.resetCamera();
        },

        //Presentation controlling functions
        hideLandmarks () {
            appViewer.hideLandmarks();
            this.landmark_list_visible = !this.landmark_list_visible;
        },

        toggleMenu(){
            this.menu_display_wrapper_el.classList.toggle("closed");
            this.menu_wrapper_closer_el.classList.toggle("closed");
        },

        away: function() {
            if(this.context_menu_active){
                this.context_menu_active = false;
                this.context_menu_el.style["left"] = -10000 + "px";
                this.context_menu_el.style["top"] = -10000 + "px";
            }
          },
    }
    
}

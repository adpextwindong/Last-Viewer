// This is the Vue Component file for the 3D Viewer.
// Its seperated from the APP￥\

var Viewer = require('../viewer/viewer_engine.js');
var appViewer = new Viewer();

//from https://gist.github.com/renaudtertrais/25fc5a2e64fe5d0e86894094c6989e10
const zip = (arr, ...arrs) => {
    return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
}

module.exports = {
    template : `

    <div id="data_display_wrapper">
        <div id="landmark_nametag_wrapper">
            <span id="landmark_nametag">{{ landmark_highlighted_name }}</span>
        </div>
        <div id="data_display" >
            <button type="button" v-on:click="resetCamera()">Reset Camera</button>

            <scene_graph_hiearchy
                v-bind:scene_graph_representation="scene_graph_representation"
                v-bind:engine_interface="engine_interface"
                ></scene_graph_hiearchy>

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
        this.$on('viewer_landmark_hover_on', function(parent_key, viewer_group_name){    
            let ind = this.landmarks[parent_key].findIndex(element => element.group_name === viewer_group_name);
            if(ind !== -1){
                this.landmarks[parent_key][ind].isActive = true;

                //TODO theres something buggy right now about the nametag highlighting with the hoverOn/Off
                this.$set(this, "landmark_highlighted", true);
                this.landmark_highlighted_name = viewer_group_name + " " + this.landmarks[parent_key][ind].description;
            }
        });
        this.$on('viewer_landmark_hover_off', function(parent_key, viewer_group_name){
            let ind = this.landmarks[parent_key].findIndex(element => element.group_name === viewer_group_name);

            if(ind !== -1){
                this.landmarks[parent_key][ind].isActive = false;

                this.$set(this, "landmark_highlighted", false);
                this.landmark_highlighted_name = "";
            }
        });


        this.$on('viewer_landmark_highlighted_position', function(hightlighted_position_v2){
            this.lm_nametag_el.style["left"] = (hightlighted_position_v2.x + 20) + "px";
            this.lm_nametag_el.style["top"] = (hightlighted_position_v2.y - 20) + "px";
        });
    },

    methods: {
        launchViewer(target_element, processed_loadGraphList) {
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

            let viewer_component_scope = this;
            //This function will be the event emitter handle to the Vue component from the Viewer Engine.
            let viewer_component_event_handle = function (event_name, ...args){
                viewer_component_scope.$emit(event_name, ...args);
                // console.log("Emitted "+event_name+ " event from Viewer Engine");
            };

            appViewer.init(target_element, viewer_component_event_handle, processed_loadGraphList);

            this.$set(this, 'scene_graph_representation', processed_loadGraphList.map(g=> g.buildGraphRepresentationModel()));

            this.$on('viewer_scene_graph_change', function(){
                console.log("Scene Graph change recieved");
                this.$set(this, 'scene_graph_representation', processed_loadGraphList.map(g=> g.buildGraphRepresentationModel()));
            });

            this.$on('scene_graph_component_remove_uuid_request', function(uuid){
                appViewer.manager_removeUUID(uuid);
            });

            //Refactor RAF loop
            appViewer.animateLoop();

            //Engine interface for controller components
            this.engine_interface = {
                toggleVisibilityUUID : function(uuid){
                    appViewer.toggleVisibilityUUID(uuid);
                },
                emitRemoveUUIDRequest: function(uuid){
                    this.$emit('scene_graph_component_remove_uuid_request', uuid);
                }.bind(this),
            };

            this.lm_nametag_el = document.querySelector("#landmark_nametag_wrapper span");
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
                            'description': ind[0].slice(2),
                            'group_name': ind[1].slice(2),
                            'isActive': false
                        })
            });   
        },

        //Engine controls for the data display control panel.
        //These functions just expose the Viewer Engine's external interface to the VueJS component at compilation time.
        resetCamera () {
            appViewer.resetCamera();
        },

        hideLandmarks () {
            appViewer.hideLandmarks();
            this.landmark_list_visible = !this.landmark_list_visible;
        }
    }
    
}

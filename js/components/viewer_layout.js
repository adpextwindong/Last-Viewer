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
            <landmark_list v-for="(landmark_group,key,index) in landmarks"
                v-bind:landmark_group="landmark_group"
                v-bind:key=index></landmark_list>
            <button type="button" v-on:click="hideLandmarks()">Hide all landmarks</button>
        </div>
        <!-- When the app state transitions to AppStates.LOADED the Viewer will attach its renderer to the DOM -->
    </div>
    `,
    data() {
        return {
            //Refactor for multi objs
            landmarks : {},


            landmark_highlighted : false,
            landmark_highlighted_name : "",
        }
    },
    created() {
        //TODO make a seperate structure for organizing engine event binds and functions
        console.log("setting up test event listener")
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
            //Toggle is active demo.
            let ind = this.landmarks[parent_key].findIndex(element => element.group_name === viewer_group_name);

            if(ind !== -1){
                this.landmarks[parent_key][ind].isActive = false;

                this.$set(this, "landmark_highlighted", false);
                this.landmark_highlighted_name = "";
            }
        });

        this.$on('viewer_landmark_highlighted_position', function(hightlighted_position_v2){
            let lm_nametag = document.querySelector("#landmark_nametag_wrapper span");
            lm_nametag.style["left"] = (hightlighted_position_v2.x + 20) + "px";
            lm_nametag.style["top"] = (hightlighted_position_v2.y - 20) + "px";
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

            //TODO this could be moved to the engine side for top level objects and the whole load graph can be retained
            let objs = processed_loadGraphList.map(g => g.response_object.obj);

            let viewer_component_scope = this;
            //This function will be the event emitter handle to the Vue component from the Viewer Engine.
            let viewer_component_event_handle = function (event_name, ...args){
                viewer_component_scope.$emit(event_name, ...args);
                // console.log("Emitted "+event_name+ " event from Viewer Engine");
            };

            appViewer.init(target_element, viewer_component_event_handle, objs);

            //Refactor RAF loop
            appViewer.animateLoop();
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
            //TODO fix this to reset the whole scene.
            appViewer.resetCamera();
        },

        hideLandmarks () {
            appViewer.hideLandmarks();
        }
    }
    
}

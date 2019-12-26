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
        <div id="data_display" >
        <!-- TODO figure out how to bind the viewer methods -->
            <button type="button" v-on:click="resetCamera()">Reset Camera</button>

            <div v-if="show_test_event === true">
                UI change on test event was successful.
            </div>
            <ul>
                <li v-for="landmark in landmarks">
                    <span v-bind:class="{ active: landmark.isActive }">{{ landmark.description }}</span>
                </li>
            </ul>
            <button type="button" v-on:click="hideLandmarks()">Hide all landmarks</button>
        </div>
        <!-- When the app state transitions to AppStates.LOADED the Viewer will attach its renderer to the DOM -->
    </div>
    `,
    data() {
        return {
            landmarks : [],
            show_test_event : false
        }
    },
    created() {
        //TODO make a seperate structure for organizing engine event binds and functions
        console.log("setting up test event listener")
        this.$on('viewer_landmark_hover_on', function(msg){
            console.log("test event recieved inside component");
            this.show_test_event = !this.show_test_event;

             
            //Toggle is active demo.
            let ind = this.landmarks.findIndex(element => element.group_name === msg);
            this.landmarks[ind].isActive = true;
        });
        this.$on('viewer_landmark_hover_off', function(msg){
            console.log("test event recieved inside component");
            this.show_test_event = !this.show_test_event;

             
            //Toggle is active demo.
            let ind = this.landmarks.findIndex(element => element.group_name === msg);
            this.landmarks[ind].isActive = false;
        });
    },
    methods: {
        launchViewer(target_element, response_text_obj_pair) {
                let {text, obj} = response_text_obj_pair;
                this.__initLandmarkTexts(text);

                viewer_component_scope = this;
                appViewer.init(target_element, obj, function (event_name, msg){
                    //This function will be the event emitter handle to the component for the Viewer Engine.
                    viewer_component_scope.$emit(event_name, msg);
                    console.log("Emitted "+event_name+ " event from Viewer Engine");
                });
                appViewer.animateLoop();
        },

        __initLandmarkTexts(text){
            //Parses the obj textfile for the landmark descriptions and group names.
            //Landmark groups are always preceeded by a description line
            //# Pternion     -> Evens
            //g landmark_0   -> Odds
            //slice(2) in this line drops the first comment/group name seen in the file as its the foot model group.
            let xs = text.split('\n').filter(s => s[0] === '#' || s[0] === 'g');//.slice(2);
            let evens = xs.filter((s, ind) => ind % 2 === 0);
            let odds = xs.filter((s, ind) => ind % 2 === 1);
            
            //slice(2) in this case drops the leading "# " and "g " line markers in the obj format
            zip(evens,odds).forEach(ind => {
                this.landmarks.push({
                            'description': ind[0].slice(2),
                            'group_name': ind[1].slice(2),
                            'isActive': false
                        })
            });
            //TODO remove this after PoC is complete for the 3d picking
            this.landmarks[0].isActive = true;
                
        },

        //Engine controls for the data display control panel.
        resetCamera () {
            //TODO fix this to reset the whole scene.
            appViewer.resetCamera();
        },

        hideLandmarks () {
            appViewer.hideLandmarks();
        }
    }
    
}

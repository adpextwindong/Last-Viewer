// This is the Vue Component file for the 3D Viewer.
// Its seperated from the APP￥\

var Viewer = require('../viewer/viewer_engine.js');
var appViewer = new Viewer();

module.exports = {
    template : `
    <div id="data_display_wrapper">
        <div id="data_display" >
        <!-- TODO figure out how to bind the viewer methods -->
            <button type="button" v-on:click="resetCamera()">Reset Camera</button>

            Heres where all the data goes.

            <span>249.8</span>

            <span>0</span>

            <span>232.4</span>

            <span>94.4</span>

            <span>238.9</span>
            <button type="button" v-on:click="hideLandmarks()">Hide all landmarks</button>
        </div>
        <!-- When the app state transitions to AppStates.LOADED the Viewer will attach its renderer to the DOM -->
    </div>
    `,
    methods: {
        launchViewer(target_element, response_obj) {
                appViewer.init(target_element, response_obj);
                appViewer.animateLoop();
        },

        //Engine controls for the data display control panel.
        resetCamera () {
            appViewer.resetCamera();
        },

        hideLandmarks () {
            appViewer.hideLandmarks();
        }
    }
    
}

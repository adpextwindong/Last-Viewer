// This is the Vue Component file for the 3D Viewer.
// Its seperated from the APP
var vueclickaway = require('vue-clickaway');

var Viewer = require('../viewer/viewer_engine.js');
var appViewer = new Viewer();

const CONFIG = require("../config");
        LandmarkParser = require("../loader/landmark_parser_utils");

module.exports = {
    mixins: [ vueclickaway.mixin ],
  
    locales : {
        en: {

        },
        jp: {
            'Hide all landmarks': '全てのランドマークを非表示',
            'Return to home':'ホームに戻る',
            'Reset Camera': 'カメラをリセット',
        },
    },

    template : `

    <div id="data_display_wrapper" class="wrapper">
        <landmark_nametag/>

        <!-- Everything above this should be absolute position UI elements, everything else should go into the display wrapper-->
        
        <div id="data_display" class="wrapper_open" >
            <button type="button"
                v-if="config.DEBUG"
                v-on:click="returnToHome()">{{t('Return to Home Page')}}</button>

            <button type="button" v-on:click="engine_interface.resetCamera()">{{t('Reset Camera')}}</button>

            <view_controls v-bind:engine_interface="engine_interface"></view_controls>

            <scene_graph_hiearchy v-if="config.DEBUG"
                v-bind:scene_graph_representation="scene_graph_representation"
                v-bind:engine_interface="engine_interface"
            />

            <landmark_list></landmark_list>
            <button type="button" v-on:click="toggleLandmarks()">{{t('Hide all landmarks')}}</button>
            
        </div>
        <!-- When the app state transitions to AppStates.LOADED the Viewer will attach its renderer to the DOM -->
        <div id="wrapper_closer" v-on:click="toggleDisplayMenu()">
            
        </div>
    </div>
    `,
    //It might be easier for a control object for each component to be generated that contains closures for each thing
    //instead of vbinding everything. Ofc theres no compile time guarentee that the controls match up.
    computed : {
        config(){
            return CONFIG
        }
    },
    data() {
        return {
            scene_graph_representation : [],
            //Passed as prop to children for manipulating the scene
            engine_interface : {},
        }
    },

    beforeRouteLeave (to, from, next) {
    // called when the route that renders this component is about to
    // be navigated away from.
    // has access to `this` component instance.
        //and hide the canvas
        // appViewer.__shutdown_still_warm = true;
        appViewer.__shutdownEngineDomElements();
        appViewer = undefined;
        
        // delete appViewer;
        appViewer = new Viewer();
        nav = document.querySelector("#router_nav");
        nav.classList.remove("hide_me");
        next();
    },

    //This is a hack around the parent owning the element & loadTree list
    //but is unable to watch the mounting of the v-if'd layout component.
    //Once the parent loads, it stashes this function.
    mounted() {
        //We need some sort of flush flag when the router goes elsewhere and comes back with a new loadTree
        //If they go to the settings menu or something it shouldnt flush a warm scene in the background.
        loadTrees = this.$store.getters["loadTrees/trees"];
        if(loadTrees !== undefined){
            nav = document.querySelector("#router_nav");
            nav.classList.add("hide_me");

            this.launchViewer(this.$root.$el, loadTrees);
            // if(appViewer.__shutdown_still_warm){
            //     //scrap the old stuff
                
            // }
        }else{
            //Force the user back to home if they just refresh on the engine route
            this.$router.push('/');
        }


    },

   created() {
           this.$on('contextmenu_selected_uuids', function(uuids){
            //    console.log("Recieved selected uuids for context menu interaction");
            //    console.log(uuids);
           });

           //POSITIONING
           this.$on('viewer_context_menu_position', function(context_menu_position_v2){
               this.context_menu_active = true;
               this.context_menu_el = document.querySelector('#context_menu');
               this.context_menu_el.style["left"] = (context_menu_position_v2.x + 20) + "px";
               this.context_menu_el.style["top"] = (context_menu_position_v2.y - 20) + "px";
           });
    },
    methods: {
        //Must occur after appViewer.init
        __bindEngineInterface(){
            this.engine_interface = {
                //Used for children components to trigger appViewer manager.removeUUID
                emitRemoveUUIDRequest: function(uuid){
                    this.$emit('scene_graph_component_remove_uuid_request', uuid);
                }.bind(this),

                toggleVisibilityUUID : appViewer.manager.toggleVisibility.bind(appViewer.manager),

                resetCamera : appViewer.resetCamera.bind(appViewer),
                view_top : appViewer.view_TOP.bind(appViewer),
                view_left : appViewer.view_LEFT.bind(appViewer),
                view_right : appViewer.view_RIGHT.bind(appViewer),
                view_toe_end : appViewer.view_TOE_END.bind(appViewer),
                view_heel_end : appViewer.view_HEEL_END.bind(appViewer),
                view_bottom : appViewer.view_BOTTOM.bind(appViewer),
            };
        },
        launchViewer(target_element, processed_loadTreeList) {
            //This function will be the event emitter handle to the Vue component from the Viewer Engine.
            let viewer_component_event_handle = function (event_name, ...args){
                this.$emit(event_name, ...args); //Viewer Layout Component Scope
                // console.log("Emitted "+event_name+ " event from Viewer Engine");
            }.bind(this);

            appViewer.init(target_element, viewer_component_event_handle, processed_loadTreeList, this.$store);
            this.__bindEngineInterface();

            this.$store.commit("landmarks/initializeLandmarks", processed_loadTreeList);

            //EVENTS
            this.$set(this, 'scene_graph_representation', processed_loadTreeList.map(t=> t.buildTreeRepresentationModel()));

            //This is the event handler that queries the loadTreeList for updates on the scene graph model.
            this.$on('viewer_scene_graph_change', function(){
                console.log("Scene Graph change recieved");
                this.$set(this, 'scene_graph_representation', processed_loadTreeList.map(t=> t.buildTreeRepresentationModel()));
            });

            this.$on('scene_graph_component_remove_uuid_request', function(uuid){
                appViewer.manager.removeUUID(uuid);
            });

            //WISHLIST Refactor RAF loop
            //Starts rendering the scene
            appViewer.animateLoop();

            //Stashing elements to avoid dom traversals later
            this.menu_display_wrapper_el = document.querySelector("#data_display_wrapper");
            this.menu_wrapper_closer_el = document.querySelector("#wrapper_closer");
        },

       //Control and presentation should be seperated.
        toggleLandmarks () {
            appViewer.hideLandmarks();
            this.$store.commit("landmarks/toggle_landmark_list");
        },

        returnToHome () {
            this.$router.push('/');
        },
        
        toggleDisplayMenu(){
            this.menu_display_wrapper_el.classList.toggle("closed");
            this.menu_wrapper_closer_el.classList.toggle("closed");
        },
    }
    
}

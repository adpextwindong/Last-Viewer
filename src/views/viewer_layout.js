// This is the Vue Component file for the 3D Viewer.
// Its seperated from the APP
import vueclickaway from 'vue-clickaway';

import ViewerEngine from '../engine/ViewerEngine';
import ENGINE_EVENTS from "../engine/engine_events";
var appViewer;

import APP_SETTINGS from "../app_settings";

//import LandmarkParser from "../../loader/landmark_parser_utils";
//TODO move the landmark parser into a file loading layer that handles meta data and lifetimes nicely.

export default {
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
                v-if="app_settings.DEBUG"
                v-on:click="returnToHome()">{{t('Return to Home Page')}}</button>

            <button type="button" v-on:click="engine_interface.resetCamera()">{{t('Reset Camera')}}</button>

            <view_controls v-bind:engine_interface="engine_interface"></view_controls>

            <scene_graph_hiearchy
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
        app_settings(){
            return APP_SETTINGS
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
        if(appViewer){
            appViewer.__shutdownEngineDomElements();
            appViewer = undefined;
        }

        // delete appViewer;
        // TODO fix this interaction from the refactor
        //appViewer = new ViewerEngine();
        let nav = document.querySelector("#router_nav");
        nav.classList.remove("hide_me");
        next();
    },

    //This is a hack around the parent owning the element & loadTree list
    //but is unable to watch the mounting of the v-if'd layout component.
    //Once the parent loads, it stashes this function.
    mounted() {
        //We need some sort of flush flag when the router goes elsewhere and comes back with a new loadTree
        //If they go to the settings menu or something it shouldnt flush a warm scene in the background.
        let loadTrees = this.$store.getters["loadTrees/trees"];
        if(loadTrees !== undefined){
            let nav = document.querySelector("#router_nav");
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
           this.$on(ENGINE_EVENTS.contextmenu_selected_uuids, function(uuids){
            //    console.log("Recieved selected uuids for context menu interaction");
                console.log(uuids);
           });

           //POSITIONING
           this.$on(ENGINE_EVENTS.viewer_context_menu_position, function(context_menu_position_v2){
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
                //Used for children components to trigger appViewer scene_manager.removeUUID
                emitRemoveUUIDRequest: function(uuid){
                    this.$emit('scene_graph_component_remove_uuid_request', uuid);
                }.bind(this),

                addFootDimensionData: function(uuid, dimensions){
                    appViewer.scene_manager.addFootDimensionData(uuid, dimensions);
                    this.$emit(ENGINE_EVENTS.scene_graph_change);
                }.bind(this),

                //TODO viewerScope.rerender();
                toggleVisibilityUUID : appViewer.scene_manager.toggleVisibility.bind(appViewer.scene_manager),

                resetCamera     : appViewer.controller.resetCamera.bind(appViewer),
                view_top        : appViewer.controller.view_TOP.bind(appViewer),
                view_left       : appViewer.controller.view_LEFT.bind(appViewer),
                view_right      : appViewer.controller.view_RIGHT.bind(appViewer),
                view_toe_end    : appViewer.controller.view_TOE_END.bind(appViewer),
                view_heel_end   : appViewer.controller.view_HEEL_END.bind(appViewer),
                view_bottom     : appViewer.controller.view_BOTTOM.bind(appViewer),
            };
        },
        launchViewer(target_element, processed_loadTreeList) {
            //This function will be the event emitter handle to the Vue component from the Viewer Engine.
            let viewer_component_event_handle = function (event_name, ...args){
                this.$emit(event_name, ...args); //Viewer Layout Component Scope
                // console.log("Emitted "+event_name+ " event from Viewer Engine");
            }.bind(this);

            appViewer = new ViewerEngine(target_element, viewer_component_event_handle, this.$store, processed_loadTreeList);
            this.__bindEngineInterface();
            let layout_scope = this;
            const rebuild_scene_graph = function(){
                layout_scope.$set(layout_scope, 'scene_graph_representation', appViewer.scene_manager.buildSceneGraphModels());
            }
            //EVENTS
            
            //This is the event handler that queries the loadTreeList for updates on the scene graph model.
            this.$on(ENGINE_EVENTS.scene_graph_change, function(){
                console.log("Scene Graph change recieved");
                rebuild_scene_graph();
            });

            this.$on(ENGINE_EVENTS.scene_graph_component_remove_uuid_request, function(uuid){
                appViewer.scene_manager.removeUUID(uuid);
            });

            appViewer.attachToPageElement();
            //Starts rendering the scene
            appViewer.animateLoop();

            //Stashing elements to avoid dom traversals later
            this.menu_display_wrapper_el = document.querySelector("#data_display_wrapper");
            this.menu_wrapper_closer_el = document.querySelector("#wrapper_closer");
        },

       //Control and presentation should be seperated.
        toggleLandmarks () {
            appViewer.controller.hideLandmarks();
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

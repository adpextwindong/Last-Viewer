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
        <div id="landmark_nametag_wrapper">
            <span id="landmark_nametag">{{ landmark_highlighted_name }}</span>
        </div>
        
        <!-- <div v-on-clickaway="hideContextMenu" id="context_menu">
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
        </div> -->

        <!-- Everything above this should be absolute position UI elements, everything else should go into the display wrapper-->
        
        <div id="data_display" class="wrapper_open" >
            <button type="button"
                v-if="config.DEBUG"
                v-on:click="returnToHome()">{{t('Return to Home Page')}}</button>
            <button type="button" v-on:click="engine_interface.resetCamera()">{{t('Reset Camera')}}</button>

            <!-- TODO REFACTOR VUEX COMPONENT view controls component -->
            <view_controls v-bind:engine_interface="engine_interface"></view_controls>


            <scene_graph_hiearchy v-if="config.DEBUG"
            v-bind:scene_graph_representation="scene_graph_representation"
            v-bind:engine_interface="engine_interface"
            />

            <div v-if="landmark_list_visible === true">
                <landmark_list v-for="(landmark_group,key,index) in landmarks"
                    v-bind:landmark_group="landmark_group"
                    v-bind:key=index></landmark_list>
            </div>
            <button type="button" v-on:click="hideLandmarks()">{{t('Hide all landmarks')}}</button>
            
        </div>
        <!-- When the app state transitions to AppStates.LOADED the Viewer will attach its renderer to the DOM -->
        <div id="wrapper_closer" v-on:click="toggleDisplayMenu()">
            
        </div>
    </div>
    `,

    //This is a hack around the router
    props :  ['loadTreesGetter'],

    //It might be easier for a control object for each component to be generated that contains closures for each thing
    //instead of vbinding everything. Ofc theres no compile time guarentee that the controls match up.
    computed : {
        config(){
            return CONFIG
        }
    },
    data() {
        return {
            
            //Indexed by obj.name of top level scan objects
            //This might need to be indexed by UUID
            landmarks : {},

            //TODO REFACTOR VUEX context menus to make this more declarative
            //Refactor for multi objs
            //If we had a feature like landmark highlighting for contextual measurments (Ball girth length, circumference, etc)
            //Menus like the side detail menu might want to hide things.

            //This state should be pushed down to a component
            landmark_highlighted : false,
            landmark_highlighted_name : "",
            landmark_list_visible : true,

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

    //TODO REFACTOR VUEX
    //This is a hack around the parent owning the element & loadTree list
    //but is unable to watch the mounting of the v-if'd layout component.
    //Once the parent loads, it stashes this function.
    mounted() {
        //We need some sort of flush flag when the router goes elsewhere and comes back with a new loadTree
        //If they go to the settings menu or something it shouldnt flush a warm scene in the background.
        loadTrees = this.loadTreesGetter();
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
           const applyOnExistingLandmark = (parent_key, viewer_group_name, f) => {
               if(this.landmarks[parent_key]){
                   let ind = this.landmarks[parent_key].findIndex(element => element.group_name === viewer_group_name);
                   if(ind !== -1){
                       f(ind);
                   }
               }
           };
           
            // 
            //PRESENTATION STYLING AND CONTENT EVENT HANDLERS
            // 

            ////TODO REFACTOR VUEX PRESENTATION
            //This could be moved to a landmark component
           this.$on('viewer_landmark_hover_on', function(parent_key, viewer_group_name){   
               applyOnExistingLandmark(parent_key, viewer_group_name, (ind) =>{
                   this.landmarks[parent_key][ind].isActive = true;
                   this.$set(this, "landmark_highlighted", true);

                   let group_name = CONFIG.DEBUG ? viewer_group_name : "";
                   this.landmark_highlighted_name = group_name + " " + this.t(this.landmarks[parent_key][ind].description);
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
            //    console.log("Recieved selected uuids for context menu interaction");
            //    console.log(uuids);
           });

           //TODO REFACTOR VUEX, we should figure out how slow this kind of data binding will be in Vuex

           this.$on('viewer_landmark_highlighted_position', function(hightlighted_position_v2){
               this.lm_nametag_el = document.querySelector("#landmark_nametag_wrapper span");
               this.lm_nametag_el.style["left"] = (hightlighted_position_v2.x + 20) + "px";
               this.lm_nametag_el.style["top"] = (hightlighted_position_v2.y - 20) + "px";
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

                toggleVisibilityUUID : appViewer.manager.toggleVisibility.bind(appViewer),

                addFootDimensionData : appViewer.manager.addFootDimensionData.bind(appViewer),

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
            appViewer.init(target_element, viewer_component_event_handle, processed_loadTreeList);
            this.__bindEngineInterface();


            this.__grabLandmarks(processed_loadTreeList);


            //EVENTS
            this.$set(this, 'scene_graph_representation', processed_loadTreeList.map(t=> t.buildTreeRepresentationModel()));

            //CRITICAL EVENT LAYER
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
            this.lm_nametag_el = document.querySelector("#landmark_nametag_wrapper span");
            this.menu_display_wrapper_el = document.querySelector("#data_display_wrapper");
            this.menu_wrapper_closer_el = document.querySelector("#wrapper_closer");
        },

        __grabLandmarks(processed_loadTreeList){
            let initLandmarkTexts = (parent_obj_name, text) => {
                //This should be hoisted out.
                this.$set(this.landmarks, parent_obj_name, []);
                this.landmarks[parent_obj_name].push(...LandmarkParser.parseLandmarkTextToList(text));
            };

            let addLandmarks = tree_node => {
                let {text, obj} = tree_node.response_object;
                initLandmarkTexts(obj["name"],text);
                
                if(tree_node.overlay_children){
                    tree_node.overlay_children.forEach(child => {
                        addLandmarks(child);
                    })
                }
            }
            processed_loadTreeList.forEach(t => addLandmarks(t));
        },

        ///
        ///TODO REFACTOR VUEX
        ///
        
        //Control and presentation should be seperated.
        hideLandmarks () {
            appViewer.hideLandmarks();
            //This is a example of a Vuex interaction potentially
            this.landmark_list_visible = !this.landmark_list_visible;
        },

        returnToHome () {
            this.$router.push('/');
        },
        
        //TODO REFACTOR VUEX PRESENTATION
        toggleDisplayMenu(){
            this.menu_display_wrapper_el.classList.toggle("closed");
            this.menu_wrapper_closer_el.classList.toggle("closed");
        },

        hideContextMenu: function() {
            if(this.context_menu_active){
                this.context_menu_active = false;
                this.context_menu_el.style["left"] = -10000 + "px";
                this.context_menu_el.style["top"] = -10000 + "px";
            }
          },
    }
    
}

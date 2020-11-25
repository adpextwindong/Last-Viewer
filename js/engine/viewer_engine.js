var THREE = require('three');
var TrackballControls = require('three-trackballcontrols');
var THREEx		= THREEx 		|| {};
var _THREEX_KEYBOARD = require("../../lib/vendor/THREEx.KeyboardState");
_THREEX_KEYBOARD(THREEx);
var _THREEX_RESIZE = require("../../lib/vendor/THREEx.WindowResize");
_THREEX_RESIZE(THREEx);

var keyboard = new THREEx.KeyboardState();

const CONFIG = require("../config"),
      MOBILE_UTILS = require('./mobile_utils.js'),
      LIGHTS = require('./lights.js'),
      PickHelper = require('./pick_helper.js'),
      ResourceManager = require("./resource_manager");
   
module.exports = function () {
    return {
        //function to emit event to the containing Vue component
        fire_event_to_component: null,
        target_element: null,

        init: function (target_element, component_event_emitter, processed_loadGraphList, store) {

            this.$store = store;
            MOBILE_UTILS.hideAddressBarOnMobile();

            this.fire_event_to_component = component_event_emitter;
            this.target_element = target_element;
            
            //SCENE
            this.scene = new THREE.Scene();

            this.manager = new ResourceManager(this.scene, processed_loadGraphList);
            
            // CAMERA
            screen_height = window.innerWidth;
            screen_width  = window.innerHeight;
            view_angle = 60;
            aspect = screen_width / screen_height;
            near = 0.1;
            far = 2000;

            this.camera = new THREE.PerspectiveCamera( view_angle, aspect, near, far );

            this.scene.add(this.camera);
            this.camera.position.set(0, 0, 500);
            this.camera.lookAt(this.scene.position);
            this.camera.layers.enable(0);
            this.camera.layers.enable(CONFIG.LAYERS_SCANS);
            this.camera.layers.enable(CONFIG.LAYERS_LANDMARKS);
            this.camera.layers.enable(CONFIG.LAYERS_MEASUREMENT_LINES);
            
            //THREEJS HELPERS
            var axesHelper = new THREE.AxesHelper( 1000 );
            this.scene.add( axesHelper );   

            // var cameraHelper = new THREE.CameraHelper( this.camera );
            // this.scene.add( cameraHelper );

            this.__setupLighting();

            this.ground_grid = new THREE.GridHelper( 200, 40, 0x000000, 0x000000 );
            this.scene.add( this.ground_grid );


            this.renderer = new THREE.WebGLRenderer( {antialias: CONFIG.ANTI_ALIASING, alpha : CONFIG.ALPHA});
            this.renderer.setSize( screen_width, screen_height );
           
            // CONTROLS
            this.controls = new TrackballControls( this.camera, this.renderer.domElement );
            this.controls.maxDistance = CONFIG.MAX_DISTANCE;
            
            // 
            // EVENTS
            //
            THREEx.ResizeForWidthOffset(this.renderer, this.camera, target_element, this.controls);

            this.__appendRendererToDom();
            //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
            window.dispatchEvent(new Event('resize'));
            this.controls.handleResize();
            
            //WISHLIST GPU PICKING
            this.pickHelper = new PickHelper(store);
            this.pickHelper.clearPickPosition();
            this.__bindMouseEngineEvents();
          
            //
            //HOTFIX SECTION
            //
            //AxesHelper 
            this.___HOTFIX_axesHelperVisibility();

            //First render is performed by appViewer.animateLoop(); in viewer_layout
        },

        __bindMouseEngineEvents: function()
        {
            //TODO maybe these need to force rerender this.rerender();

            // Binds engine events such as click handlers for the mouse leftclick and context menu, mouse position

            //These bindings should be seperated from Mobile client bindings.
            viewerScope = this;

            this.__state_current_mouse_handler = function(e){
                this.__state_mouse_handle_click_event = e;
                viewerScope.rerender("current_mouse_handler");
            }.bind(this);
            this.renderer.domElement.addEventListener('click', this.__state_current_mouse_handler);

            this.renderer.domElement.addEventListener('contextmenu', function(e){
                let vector = {
                    x: e.clientX,
                    y: e.clientY,
                };
                if(CONFIG.CONTEXT_MENU_ENABLED){
                    this.fire_event_to_component("viewer_context_menu_position", vector);
                }
                this.__state_mouse_handle_contextmenu_event = e;
            }.bind(this));

            viewer_scope = this;
            this.renderer.domElement.addEventListener('mousemove', function (e){
                //WISHLIST add a flag to the contextmenu handler to check for a mouse move of a certain distance?
                //The right click drag for moving shouldn't open a context menu

                this.setPickPosition(e, viewer_scope.renderer.domElement);
                viewerScope.rerender("mousemove");
            }.bind(this.pickHelper));

            this.renderer.domElement.addEventListener('mouseout', function(event){
                this.pickHelper.clearPickPosition.bind(this.pickHelper);
                viewerScope.rerender("mouseout");
            });
            this.renderer.domElement.addEventListener('mouseleave', function(event) {
                this.pickHelper.clearPickPosition.bind(this.pickHelper);
                viewerScope.rerender("mouseleave");
            });
          
            //TODO TASK TESTING Touch stuff needs to be tested on mobile
            this.renderer.domElement.addEventListener('touchstart', function(event) {
              // prevent the window from scrolling
              event.preventDefault();
              this.pickHelper.setPickPosition(event.touches[0], viewer_scope.renderer.domElement);

              viewerScope.rerender("touchstart");
            }.bind(this), {passive: false});
          
            this.renderer.domElement.addEventListener('touchmove', function(event) {
                event.preventDefault();
                this.pickHelper.setPickPosition(event.touches[0], viewer_scope.renderer.domElement);

                viewerScope.rerender("touchmove");
            }.bind(this));
          
            this.renderer.domElement.addEventListener('touchend', function(event){
                event.preventDefault();

                viewerScope.rerender("touchend");
                // We need to consider passively deselecting if the touchend occurs on 1 touch finger only and is off anything highlightable.
                // this.pickHelper.clearPickPosition.bind(this.pickHelper);
            });
        },

        //TODO debug all UI interactions to force rerender, and finalize RAF architecture removal
        //TODO debug why this hangs on Android
        animateLoop: function () 
        { 
            if(this.__canvasOnPage){
                this.__render();		
                this.__update();
            }
        },

        //TODO include a flag that any UI/Touch event forces true that causes a rerender.
        rerender : function (source){
            this.animateLoop();
            if(source){
                console.log(source);
            }
        },

        __appendRendererToDom : function () {
            this.target_element.append(this.renderer.domElement);
            this.__canvasOnPage = true;
        },

        __restart: function(){
            this.__appendRendererToDom();
            this.lighting.append_gui(this.target_element);
        },

        __shutdownEngineDomElements : function(){
            //This function has to defensively call the functions cause the router will call this if someone mounts the viewer_layout without loading
            this.__removeRendererFromPage();
            if(this.lighting){
                this.lighting.shutdown();
            }

            if(this.scene){
                this.scene.dispose();
            }
            if(this.renderer){
                this.renderer.dispose();
            }
        },

        __removeRendererFromPage : function() {
            if(this.renderer && this.renderer.domElement){
                this.target_element.removeChild(this.renderer.domElement);
            }
            this.__canvasOnPage = false;
        },

        __setupLighting :function(){
            this.lighting = new LIGHTS();
            this.lighting.init();
            this.lighting.lights.forEach(light => {
                light.layers.enable(0);
                this.scene.add(light)
            });

            if( CONFIG.LIGHT_DEBUG) {
                this.lighting.setupLightGUI(this.target_element);
            }
        },
        __update: function ()
        {
            this.controls.update();
            this.__manager_flush_change();
        },
        __render: function () {
            this.renderer.render( this.scene, this.camera );
            this.pickHelper.pick(this.pickHelper.pickPosition, this.scene, this.camera);

            //Picking must happen after rendering
            this.pickHelper.fireEvents(this.fire_event_to_component, this.camera, this.renderer);

            //WISHLIST Change this for touch events as well 1/21/20
            if(this.__state_mouse_handle_click_event){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, keyboard.pressed("shift"))
                this.__state_mouse_handle_click_event = false; //Clears mouse event on handle
            }

            if(this.__state_mouse_handle_contextmenu_event){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, true, true);
                //WISHLIST context menu handling
                //We should add handling for a context enum that can handle different context situations and obj interactions.
                this.fire_event_to_component("contextmenu_selected_uuids", this.pickHelper.selection.map(o => o.obj.uuid));
                this.__state_mouse_handle_contextmenu_event = false;
            }
        },


        
        //External facing functions for controling the scene from the viewer layout Vue component.
        //TODO rename these EXTERNAL
        //TODO these all force rerender
        resetCamera: function (){
            this.controls.reset();

            this.rerender("resetCamera");
        },

        view_RIGHT: function(){
            //Get current center, based on the right click panning around
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,-dist,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);
            
            this.rerender("view_RIGHT");
       },

        view_LEFT: function(){
            //Get current center, based on the right click panning around
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,dist,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);

            this.rerender("view_LEFT");
       },

        view_TOE_END: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(dist,0,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);

            this.rerender("view_TOE_END");
        },

        view_HEEL_END: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(-dist,0,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);

            this.rerender("view_HEEL_END");
        },

        view_TOP: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,0,dist);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(1,0,0);

            this.rerender("view_TOP");
        },

        view_BOTTOM: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,0,-dist);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(1,0,0);

            this.rerender("view_BOTTOM");
        },

        //Use bounding box to determine default rotation, then landmark to determine vertical orrientation?

        hideLandmarks : function() {
            this.camera.layers.toggle(CONFIG.LAYERS_LANDMARKS);

            this.rerender("hideLandmarks");
        },

        //
        //SCENE MANAGER
        //All functions should call __manager_flush_change() to propagate a scene graph representation model change
        //in the Layout level.
        //

        ___HOTFIX_axesHelperVisibility: function(){
            // The axes helper has an issue with being invisible on the first draw for some reason.
            // Don't know why threejs will draw it after a visibility toggle so hopefully this hotfix is enough for now.
            const toggleAll = () => {
                this.manager.mapOverTopObjs(o => this.manager.toggleVisibility(o.uuid));
            }

            toggleAll();
            this.__render();
            toggleAll();
            this.__render();
        },
      
        // CRITICAL EVENT LAYER
        // This handles telling the viewer layout to query for a new version of the scene graph model.
        __manager_flush_change : function(force=false){
            //Setters applied to managed items can set the flush flag to true
            if(force || this.manager.flush_flag){
                this.fire_event_to_component('viewer_scene_graph_change');
                this.manager.flush_flag = false;
            }
        },



    };
};
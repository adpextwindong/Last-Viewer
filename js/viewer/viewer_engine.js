var THREE = require('three');
var TrackballControls = require('three-trackballcontrols');
var LIGHTS = require('./lights.js');
var keyboard = new THREEx.KeyboardState();
const PickHelper = require('./pick_helper.js');

//CONFIG
//disable this for now as its slow
const config_ANTI_ALIASING = false;
//Limit zoom out distance
const config_MAX_DISTANCE = 1000;

module.exports = function () {
    return {
        LIGHT_DEBUG: true,
        //function to emit event to the containing Vue component
        fire_event_to_component: null,

        init: function (target_element, component_event_emitter, processed_loadGraphList) {
            this.fire_event_to_component = component_event_emitter;

            //SCENE
            this.__processed_loadGraphList = processed_loadGraphList;
            this.objs = processed_loadGraphList.map(g => g.response_object.obj);
            this.scene = new THREE.Scene();
            this.objs.forEach(o => this.scene.add( o ));
            this.__manager_init();
            
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

            //if there are no configs on the top levels then we'll default to spreading them out in a distributed fashion
            if(processed_loadGraphList.every(g => g.config === undefined)){
                console.log("defaulting positions and rotations")
                this.__setDefaultOrientations();
            }
            
            //THREEJS HELPERS
            var axesHelper = new THREE.AxesHelper( 1000 );
            this.scene.add( axesHelper );
            // var helper = new THREE.CameraHelper( this.camera );
            // this.scene.add( helper );

            this.__setupLighting(target_element);

            this.renderer = new THREE.WebGLRenderer( {antialias:config_ANTI_ALIASING, alpha : true});
            this.renderer.setSize( screen_width, screen_height );
           
            //THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
            // CONTROLS
            this.controls = new TrackballControls( this.camera, this.renderer.domElement );
            this.controls.maxDistance = config_MAX_DISTANCE;
            
            // EVENTS
            THREEx.ResizeForWidthOffset(this.renderer, this.camera, target_element, this.controls);

            this.__appendRendererToDom(target_element);
            //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
            window.dispatchEvent(new Event('resize'));
            this.controls.handleResize();

            //
            // Object Picking Events
            //
            this.pickHelper = new PickHelper();
            this.pickHelper.clearPickPosition();

            //TODO this should be added/removed based on the current context of mouse interactions.
            //The currently added function & options should be stashed so the event listener can be appropriately remvoed
            //https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Matching_event_listeners_for_removal

            //TODO contextmenu is the right click event...
            this.__state_current_mouse_handler = function(e){
                //TODO right click handling
                //We might have to hack around the current trackball controls impl
                this.__state_mouse_handle_click_event = e;
            }.bind(this);
            this.renderer.domElement.addEventListener('click', this.__state_current_mouse_handler);

            this.renderer.domElement.addEventListener('contextmenu', function(e){
                let vector = {
                    x: e.clientX,
                    y: e.clientY,
                };
                this.fire_event_to_component("viewer_context_menu_position", vector);
                this.__state_mouse_handle_contextmenu_event = e;
            }.bind(this));

            viewer_scope = this;
            window.addEventListener('mousemove', function (e){
                this.setPickPosition(e, viewer_scope.renderer.domElement);
            }.bind(this.pickHelper));

            window.addEventListener('mouseout', this.pickHelper.clearPickPosition.bind(this.pickHelper));
            window.addEventListener('mouseleave', this.pickHelper.clearPickPosition.bind(this.pickHelper));
          
            //TODO Touch stuff needs to be tested on mobile
            window.addEventListener('touchstart', function(event) {
              // prevent the window from scrolling
              event.preventDefault();
              this.pickHelper.setPickPosition(event.touches[0]);
            }.bind(this), {passive: false});
          
            window.addEventListener('touchmove', function(event) {
                this.pickHelper.setPickPosition(event.touches[0]);
            }.bind(this));
          
            window.addEventListener('touchend', this.pickHelper.clearPickPosition.bind(this.pickHelper));
        },

        //TODO change this RAF architecture to not redraw unless a change in the scene happens.
        animateLoop: function () 
        { 
            requestAnimationFrame( this.animateLoop.bind(this) );
            this.__render();		
            this.__update();
        },

        __appendRendererToDom : function (target_element) {
            target_element.append(this.renderer.domElement);
        },

        __setupLighting :function(target_element){
            this.lighting = new LIGHTS();
            this.lighting.init();
            this.lighting.lights.forEach(light => this.scene.add(light));

            if( this.LIGHT_DEBUG) {
                this.lighting.setupLightGUI(target_element);
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

            if(this.__state_mouse_handle_click_event){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, keyboard.pressed("shift"))
                this.__state_mouse_handle_click_event = false; //Clears mouse event on handle
            }

            if(this.__state_mouse_handle_contextmenu_event){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, true)
                //TODO context menu handling
                //We should add handling for a context enum that can handle different context situations and obj interactions.
                this.fire_event_to_component("contextmenu_selected_uuids", this.pickHelper.selection.map(o => o.obj.uuid));
                this.__state_mouse_handle_contextmenu_event = false;
            }
        },

        __setDefaultOrientations: function(){
            let max_mesh_width = Math.max.apply(Math, this.objs.map(o =>{
                o.children[0].geometry.computeBoundingBox();
                return o.children[0].geometry.boundingBox.getSize();
            }).map(v => v.x));

            //Position the foot objs across the X axis in a distributed manner.
            for(let i = 0; i < this.objs.length; i++){
                this.objs[i].position.set(((-max_mesh_width*this.objs.length)/2) + i*max_mesh_width, -50, -50);
                this.objs[i].rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);
            }
        },
        
        //External facing functions for controling the scene from the viewer layout Vue component.
        resetCamera: function (){
            this.controls.reset();    
        },

        hideLandmarks : function() {
            this.objs.forEach(o => {
                o.children.forEach(c => {
                    //name is as defined by obj file Im pretty sure.
                    if(c.name !== "foot" && c instanceof THREE.Mesh){
                        c.visible = !c.visible;
                    }
                });
            });
        },

        //
        //SCENE MANAGER
        //All functions should call __manager_flush_change() to propagate a scene graph representation model change
        //in the Layout level.
        //
        manager_toggleVisibility : function(uuid){
            let xs = this.__processed_loadGraphList.flatMap(g => g.traverseForUUID(uuid));
            xs.forEach(o => {
                obj = o.getTHREEObj();
                if(o.visible){
                    o.visible = !o.visible;
                }
            });

            this.__manager_flush_change();
        },

        // CRITICAL EVENT LAYER
        // This handles telling the viewer layout to query for a new version of the scene graph model.
        __manager_flush_change : function(force=false){
            //Setters applied to managed items can set the flush flag to true
            if(force || this.manager_flush_flag){
                this.fire_event_to_component('viewer_scene_graph_change');
                this.manager_flush_flag = false;
            }
        },
        __manager_init : function(){
            this.manager_flush_flag = false;

            //Set up setters that notify the engine about property changes that the scene_graph_hiearchy component wants to show
            let engineScope = this;
            const bind_engine_watchers = function(g) {
                Object.defineProperty(g.response_object.obj, 'visible', {
                    set: function(v){
                        engineScope.manager_flush_flag = true;
                    }
                });
            }

            //Some Groups don't have a visibility option

            this.__processed_loadGraphList.forEach(g => bind_engine_watchers(g));

            //On removal we should stash the obj into a lookup table with the paths so they can be hotswapped back in potentially.
            //Now we just need a loading interface for the engine that add new graph/objs on the fly
            //Then a right click interface that goes to the nearest parent instanceOf THREE.group and appends the desired thing
            //This would of course require a menu interface for selecting a new scan.
        },

        manager_removeUUID : function(uuid){
            const isTopLevelObj = uuid => this.objs.map(o => o.uuid).indexOf(uuid) !== -1;
            
            if(isTopLevelObj(uuid)){
                let removed = this.objs.splice(this.objs.map(o => o.uuid).indexOf(uuid) ,1);
                this.scene.remove(removed[0]);
            }

            let xs = this.__processed_loadGraphList.flatMap(g => g.traverseForUUID(uuid));
            xs.forEach(o => {
                this.scene.remove(o.getTHREEObj());
                if(o.parent){
                    o.parent.getTHREEObj().remove(o.getTHREEObj());
                    o.parent.removeChild(o);
                }else{
                    //Apparently its the top of the tree or something
                    this.__processed_loadGraphList.splice(this.__processed_loadGraphList.indexOf(o), 1);
                }
            })

            this.__manager_flush_change(true);
        },

    };
};
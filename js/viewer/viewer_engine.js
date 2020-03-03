var THREE = require('three');
var TrackballControls = require('three-trackballcontrols');
var LIGHTS = require('./lights.js');

var THREEx		= THREEx 		|| {};
var _THREEX_KEYBOARD = require("../../lib/vendor/THREEx.KeyboardState");
_THREEX_KEYBOARD(THREEx);
var _THREEX_RESIZE = require("../../lib/vendor/THREEx.WindowResize");
_THREEX_RESIZE(THREEx);

var keyboard = new THREEx.KeyboardState();
const PickHelper = require('./pick_helper.js');

const CONFIG = require("../config");
const MOBILE_UTILS = require('./mobile_utils.js');

const LAYERS_SCANS = 1;
const LAYERS_LANDMARKS = 2;

module.exports = function () {
    return {
        //function to emit event to the containing Vue component
        fire_event_to_component: null,
        target_element: null,

        init: function (target_element, component_event_emitter, processed_loadGraphList) {

            MOBILE_UTILS.hideAddressBarOnMobile();

            this.fire_event_to_component = component_event_emitter;
            this.target_element = target_element;

            //SCENE
            this.__processed_loadGraphList = processed_loadGraphList;
            this.objs = processed_loadGraphList.map(g => g.response_object.obj);
            this.scene = new THREE.Scene();
            this.objs.forEach(o => {
                this.scene.add( o );
            });

            let allMeshs = this.objs.flatMap(o => o.children);
            // allMeshs.forEach(o => o.layers.enable(0));
            allMeshs.filter(o => !o.name.includes("landmark")).forEach(o => o.layers.set(LAYERS_SCANS));

            let allLandmarkMeshes = allMeshs.filter(o => o.name.includes("landmark"));
            allLandmarkMeshes.forEach(o => o.layers.set(LAYERS_LANDMARKS));

            let landmark_dict = {};
            allLandmarkMeshes.forEach(mesh => {
                let lm_ind = mesh.name.split("landmark_")[1];
                landmark_dict[lm_ind] = mesh;
            });
            console.log(landmark_dict);

            //This will need a major refactor for now as it relies on checking the parent uuid to see who it belongs to.
            this.__scene_landmarks = landmark_dict;

            

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
            this.camera.layers.enable(0);
            this.camera.layers.enable(1);
            this.camera.layers.enable(2);
            

            //if there are no configs on the top levels then we'll default to spreading them out in a distributed fashion
            if(processed_loadGraphList.every(g => g.config === undefined)){
                console.log("defaulting positions and rotations")
                this.__setDefaultOrientations();
            }
            
            //THREEJS HELPERS
            var axesHelper = new THREE.AxesHelper( 1000 );
            this.scene.add( axesHelper );   

            this.__setupLighting();

            // this.ground_grid = new THREE.GridHelper( 200, 40, 0x000000, 0x000000 );
            // this.scene.add( this.ground_grid );


            this.renderer = new THREE.WebGLRenderer( {antialias: CONFIG.ANTI_ALIASING, alpha : CONFIG.ALPHA});
            this.renderer.setSize( screen_width, screen_height );
           
            //THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
            // CONTROLS
            this.controls = new TrackballControls( this.camera, this.renderer.domElement );
            this.controls.maxDistance = CONFIG.MAX_DISTANCE;
            
            // EVENTS
            THREEx.ResizeForWidthOffset(this.renderer, this.camera, target_element, this.controls);

            this.__appendRendererToDom();
            //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
            window.dispatchEvent(new Event('resize'));
            this.controls.handleResize();

            //
            // Object Picking Events
            //

            //TODO REFACTOR Picking should be done with GPU if landmark lines/points are to be supported
            this.pickHelper = new PickHelper();
            this.pickHelper.clearPickPosition();


            //These bindings should be seperated from Mobile client bindings.
            this.__state_current_mouse_handler = function(e){
                this.__state_mouse_handle_click_event = e;
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
                //TODO add a flag to the contextmenu handler to check for a mouse move of a certain distance?
                //The right click drag for moving shouldn't open a context menu

                this.setPickPosition(e, viewer_scope.renderer.domElement);
            }.bind(this.pickHelper));

            this.renderer.domElement.addEventListener('mouseout', this.pickHelper.clearPickPosition.bind(this.pickHelper));
            this.renderer.domElement.addEventListener('mouseleave', this.pickHelper.clearPickPosition.bind(this.pickHelper));
          
            //TODO Touch stuff needs to be tested on mobile
            this.renderer.domElement.addEventListener('touchstart', function(event) {
              // prevent the window from scrolling
              event.preventDefault();
              this.pickHelper.setPickPosition(event.touches[0], viewer_scope.renderer.domElement);
            }.bind(this), {passive: false});
          
            this.renderer.domElement.addEventListener('touchmove', function(event) {
                event.preventDefault();
                this.pickHelper.setPickPosition(event.touches[0], viewer_scope.renderer.domElement);
            }.bind(this));
          
            this.renderer.domElement.addEventListener('touchend', function(event){
                event.preventDefault();
                // We need to consider passively deselecting if the touchend occurs on 1 touch finger only and is off anything highlightable.
                // this.pickHelper.clearPickPosition.bind(this.pickHelper);
            });


            //HOTFIX SECTION
            //AxesHelper 
            this.___HOTFIX_axesHelperVisibility();
        },

        //TODO change this RAF architecture to not redraw unless a change in the scene happens.
        animateLoop: function () 
        { 
            requestAnimationFrame( this.animateLoop.bind(this) );
            if(this.__canvasOnPage){
                this.__render();		
                this.__update();
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

            //TODO refactor this for touch events as well 1/21/20
            if(this.__state_mouse_handle_click_event){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, keyboard.pressed("shift"))
                this.__state_mouse_handle_click_event = false; //Clears mouse event on handle
            }

            if(this.__state_mouse_handle_contextmenu_event){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, true, true);
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
                
                this.objs[i].rotation.set(CONFIG.DEFAULT_ROTATION_X,
                    CONFIG.DEFAULT_ROTATION_Y,
                    CONFIG.DEFAULT_ROTATION_Z);
            }
        },
        
        //External facing functions for controling the scene from the viewer layout Vue component.
        resetCamera: function (){
            this.controls.reset();    
        },

        //TODO verify that this behavior is good enough
        //TODO add a bottom view.

        view_RIGHT: function(){
            // //Get current center, based on the right click panning around
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,dist,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);
        },

        view_LEFT: function(){
            // //Get current center, based on the right click panning around
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,-dist,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);
        },

        view_TOE_END: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(dist,0,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);
        },

        view_HEEL_END: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(-dist,0,0);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(0,0,1);
        },

        view_TOP: function(){
            let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
            this.camera.position.set(0,0,dist);
            
            this.camera.lookAt(new THREE.Vector3(0,0,0));
            this.camera.up = new THREE.Vector3(1,0,0);
        },

        

        hideLandmarks : function() {
            this.camera.layers.toggle(LAYERS_LANDMARKS);
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
                this.objs.map(o => o.uuid).forEach(uuid => this.manager_toggleVisibility(uuid));
            }

            toggleAll();
            this.__render();
            toggleAll();
            this.__render();
        },
        manager_addDimensionData(uuid, feet_dimensions){
            //TODO process the parsed dimensions for measurement meshes
            // we can generate and add to the mesh group

            // At first we should try the Pternion to "Foot length point Pternion-CP axis" lm0 lm27 axis along the bottom of the foot

            let {left, right} = feet_dimensions;
            
            let mesh = this.__processed_loadGraphList.flatMap(g => g.traverseForUUID(uuid))[0].response_object.obj;

            console.log("right here");

            //TODO grab associated landmarks, check if lm0 lm27 exist, 
            
            //Returns the coordinates of the landmark's tip
            const getLandmarkPoint = (mesh) =>{
                let float_32_array = mesh.geometry.attributes.position.array;

                //18 faces get laid out in an array with the last 3 refering to the 5th point, the tip.
                // f 1// 3// 2//
                // f 1// 4// 3//
                // f 1// 5// 4//
                // f 1// 2// 5//
                // f 2// 3// 4//
                // f 2// 4// 5//

                let ind = 17*3;
                return [float_32_array[0], float_32_array[1], float_32_array[2]];
            };

            //TODO refactor scene landmarks to be indexed by uuid then lm#
            if("0" in this.__scene_landmarks && "27" in this.__scene_landmarks){
                let pt_mesh = this.__scene_landmarks["0"];
                let foot_length_cp_mesh = this.__scene_landmarks["27"];

                let points = [];
                points.push(new THREE.Vector3(...getLandmarkPoint(pt_mesh)));
                points.push(new THREE.Vector3(...getLandmarkPoint(foot_length_cp_mesh)));
                
                //TODO The pt mesh point needs to be projected down onto the same Y axis plane as the

                let material = new THREE.LineBasicMaterial({
                    color: 0xffa500
                });
                let geometry = new THREE.BufferGeometry().setFromPoints(points);
                let line = new THREE.Line(geometry, material);

                //TODO add a lines layer
                line.layers.set(LAYERS_LANDMARKS);
                mesh.add(line);

            }
        },
        manager_toggleVisibility : function(uuid){
            let xs = this.__processed_loadGraphList.flatMap(g => g.traverseForUUID(uuid));
            const toggleSelfAndFirstChild = o => {
                obj = o.getTHREEObj();

                if(obj.visible !== undefined){
                    obj.visible = !obj.visible;
                }
                if(obj.type === "Group"){
                    //TODO BUGFIX This line triggers the axes helper to be visible after a toggle for some reason.
                    obj.children[0].visible = !obj.children[0].visible;
                    console.log("Toggling visibilty of ");
                    console.log(obj.children[0]);
                }
            };

            xs.forEach(toggleSelfAndFirstChild);

            this.__manager_flush_change(true);
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

        getIndexOfLowestVert(mesh, axis){
            let verts = mesh.geometry.attributes.position.array;
            let axis_mod = axis === 'X' ? 0: (axis === 'Y' ? 1: 2);

            let filtered_verts  = verts.filter((v, ind) => (ind % 3) === axis_mod);
            let min = Math.min(...filtered_verts);
            return verts.indexOf(min);
        }

    };
};
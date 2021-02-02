import * as THREE from 'three';
var THREEx = THREEx || {};
import TrackballControls from '../../lib/vendor/three-trackballcontrols';
//TODO look at these for import/export module syntax
var _THREEX_KEYBOARD = require("../../lib/vendor/THREEx.KeyboardState");
var _THREEX_RESIZE = require("../../lib/vendor/THREEx.WindowResize");
_THREEX_RESIZE(THREEx);
_THREEX_KEYBOARD(THREEx);

var keyboard = new THREEx.KeyboardState();

import ENGINE_EVENTS from "./engine_events";
import configuration from "./config";
var CONFIG = new configuration();

import MOBILE_UTILS from './utils/mobile_utils.js';
import LIGHTS from './utils/lights.js';

import PickHelper from './PickHelper';
import SceneManager from './scene/scene_manager';
import FileManager from './loader/file_manager';

class ViewerEngine {
    constructor(target_element, component_event_emitter, store, processed_loadGraphList=undefined){
        let viewerScope = this;
        this.target_element = target_element;
        //function to emit event to the containing Vue component
        this.fire_event_to_component = component_event_emitter;
        this.$store = store;

        //SCENE
        this.scene = new THREE.Scene();

        //TODO refactor this to have a file loading Vuex Store layer.
        //EXTERNAL FACING OBJECTS
        this.file_manager = new FileManager(); //Refactor this processed_loadGraphList varname to InitialLoadTree
        this.scene_manager = new SceneManager(this.scene, component_event_emitter);

        //TODO We can split this out to a function that takes scene_uuid as loadtree target and just call it on init.
        processed_loadGraphList.forEach(loadTree => {
            let load_promise = this.file_manager.load(loadTree);

            load_promise.then((results) => {
                results.forEach((result) => {
                    if(result.status !== "fulfilled"){
                        console.error("There was an unloadable section of the loadTree");
                        console.log(loadTree);
                    }
                });

                this.scene_manager.processLoadedTree(this.file_manager, loadTree, loadTree.parent);
                this.__render(); //Directly rerender after new load
                this.scene_manager.__setDefaultPositions();
                this.scene_manager.__setDefaultOrientations();
                this.fire_event_to_component(ENGINE_EVENTS.scene_graph_change);
            });
        });
        //Maybe we need to bind this.


        // CAMERA
        let screen_height = window.innerWidth;
        let screen_width  = window.innerHeight;
        let view_angle = 60;
        let aspect = screen_width / screen_height;
        let near = 0.1;
        let far = 2000;

        this.camera = new THREE.PerspectiveCamera( view_angle, aspect, near, far );

        this.scene.add(this.camera);
        this.camera.position.set(0, 0, 500);
        this.camera.lookAt(this.scene.position);

        //TODO migration from r113 to r114, raycaster now obeys camera visibility of objects
        //The scene manager should have some sort of handle on the pickhelper to toggle raycasting layers.
        this.camera.layers.enable(0);
        this.camera.layers.enable(CONFIG.LAYERS_SCANS);
        this.camera.layers.enable(CONFIG.LAYERS_LANDMARKS);
        this.camera.layers.enable(CONFIG.LAYERS_MEASUREMENT_LINES);

        //TODO push this into the SceneManager and have it look at config.
        //TODO config make it a Vuex store that can dump to a file and persist.
        //THREEJS HELPERS
        var axesHelper = new THREE.AxesHelper( 1000 );
        this.scene.add( axesHelper );

        // var cameraHelper = new THREE.CameraHelper( this.camera );
        // this.scene.add( cameraHelper );

        this.__setupLighting();

        this.renderer = new THREE.WebGLRenderer( {antialias: CONFIG.ANTI_ALIASING, alpha : CONFIG.ALPHA});
        this.renderer.setSize( screen_width, screen_height );

        this.cached_raf_ts = 0.0; //Used to prevent multiple renders in the same RAF frame.

        // CONTROLS
        this.controls = new TrackballControls( this.camera, this.renderer.domElement,
            function engine_zoom_raf_handler(){
                requestAnimationFrame((ts) => {
                    viewerScope.rerender(ts, "trackball_control_zoomer");
                })}
        );

        this.controls.maxDistance = CONFIG.MAX_DISTANCE;

        //First render is performed by appViewer.animateLoop(); in viewer_layout
        this.___setupController();
        THREEx.ResizeForWidthOffset(this.renderer, this.camera, target_element, this.controls);

        console.timeEnd("EngineInit");
    }

    //This attaches the renderer to the dom element given during the class constructor.
    //Call this function when you want to start presenting the Viewer Engine.
    attachToPageElement(){

        this.__appendRendererToDom();
        //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
        window.dispatchEvent(new Event('resize'));
        this.controls.handleResize();

        //TODO add a flag for this
        //WISHLIST GPU PICKING
        if(!CONFIG.CONTEXT_MOBILE){
            this.pickHelper = new PickHelper(this.$store);
            this.pickHelper.clearPickPosition();
        }

        //
        // EVENTS
        //
        this.__bindMouseEngineEvents();

        let viewerScope = this;
        const engine_poll_mouse = function engine_poll_mouse_loop(){
            viewerScope.controls.update();
            setTimeout(engine_poll_mouse, 5);
        }
        setTimeout(engine_poll_mouse,5);

        //
        //HOTFIX SECTION
        //
        //AxesHelper
        this.___HOTFIX_axesHelperVisibility();

        MOBILE_UTILS.hideAddressBarOnMobile();
    }

    __bindMouseEngineEvents(){
        let viewerScope = this;
        //TODO maybe these need to force rerender this.rerender();

        // Binds engine events such as click handlers for the mouse leftclick and context menu, mouse position

        //These bindings should be seperated from Mobile client bindings.

        //We can use __state_current_mouse_handler to point at different MODE mouse handlers.
        this.__state_current_mouse_handler = function engine_loaded_mouse_handler(e){
            this.__state_mouse_handle_click_event = e;

            requestAnimationFrame(function f(ts){
                viewerScope.rerender(ts, "current_mouse_handler");
            });
        }.bind(this);
        this.renderer.domElement.addEventListener('click', this.__state_current_mouse_handler);

        this.renderer.domElement.addEventListener('contextmenu', function(e){
            let vector = {
                x: e.clientX,
                y: e.clientY,
            };
            if(CONFIG.CONTEXT_MENU_ENABLED){
                this.fire_event_to_component(ENGINE_EVENTS.viewer_context_menu_position, vector);
            }
            this.__state_mouse_handle_contextmenu_event = e;
        }.bind(this));

        this.renderer.domElement.addEventListener('mousemove', function engine_mousemove_handler(event){
            event.preventDefault();
            //WISHLIST add a flag to the contextmenu handler to check for a mouse move of a certain distance?
            //The right click drag for moving shouldn't open a context menu
            if(!CONFIG.CONTEXT_MOBILE){
                this.setPickPosition(event, viewerScope.renderer.domElement);
            }
            requestAnimationFrame(function mousemove_rerender(ts){
                viewerScope.rerender(ts, "mousemove");
            });
        }.bind(this.pickHelper), false);

        //Prevents chopiness with zooming in and out
        this.renderer.domElement.addEventListener('wheel', function engine_mousewheel_handler(event){
            event.preventDefault();
            // viewerScope.rerender("wheel");
            requestAnimationFrame(function wheeltimeout_rerender(ts){
                //Prevents chopiness on scrollwheel not firing an event on wheel change end
                viewerScope.rerender(ts, "wheel_timeout");
            });
        });

        this.renderer.domElement.addEventListener('mouseout', function engine_mouseout_handler(event){
            event.preventDefault();
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.clearPickPosition.bind(this.pickHelper);
            }
            requestAnimationFrame(function mouseout_rerender(ts){
                viewerScope.rerender(ts,"mouseout");
            });
        }.bind(viewerScope));
        this.renderer.domElement.addEventListener('mouseleave', function engine_mouseleave_handler(event) {
            event.preventDefault();
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.clearPickPosition.bind(this.pickHelper);
            }
            requestAnimationFrame(function mouseleave_rerender(ts){
                viewerScope.rerender(ts,"mouseleave");
            });
        }.bind(viewerScope));

        //TODO TASK TESTING Touch stuff needs to be tested on mobile
        this.renderer.domElement.addEventListener('touchstart', function engine_touchstart_handler(event) {
          // prevent the window from scrolling
            event.preventDefault();
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.setPickPosition(event.touches[0], viewerScope.renderer.domElement);
            }

            requestAnimationFrame(function touchstart_rerender(ts){
                viewerScope.rerender(ts, "touchstart");
            });
        }.bind(viewerScope), {passive: false});

        this.renderer.domElement.addEventListener('touchmove', function engine_touchmove_handler(event) {
            event.preventDefault();
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.setPickPosition(event.touches[0], viewerScope.renderer.domElement);
            }

            requestAnimationFrame(function touchmove_rerender(ts){
                viewerScope.rerender(ts, "touchmove");
            });
        }.bind(viewerScope));

        this.renderer.domElement.addEventListener('touchend', function engine_touchend_handler(event){
            event.preventDefault();

            // We need to consider passively deselecting if the touchend occurs on 1 touch finger only and is off anything highlightable.
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.clearPickPosition.bind(this.pickHelper);
            }

            requestAnimationFrame(function touchend_rerender(ts){
                viewerScope.rerender(ts, "touchend");
            });
        }.bind(viewerScope));
    }

    //TODO debug all UI interactions to force rerender, and finalize RAF architecture removal
    //TODO debug why this hangs on Android
    animateLoop(){
        if(this.__canvasOnPage){
            this.__render();
            this.__update();
        }
    }

    //TODO include a flag that any UI/Touch event forces true that causes a rerender.
    rerender (timestamp, source){
        if(this.cached_raf_ts != timestamp){
            this.animateLoop();
            this.cached_raf_ts = timestamp;
        }
        if(source){
            console.log(source);
        }
        //console.log("Rerender letting go");
    }

    __appendRendererToDom () {
        this.target_element.append(this.renderer.domElement);
        this.__canvasOnPage = true;
    }

    __restart(){
        this.__appendRendererToDom();
        this.lighting.append_gui(this.target_element);
    }

    __shutdownEngineDomElements (){
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
    }

    __removeRendererFromPage () {
        if(this.renderer && this.renderer.domElement){
            this.target_element.removeChild(this.renderer.domElement);
        }
        this.__canvasOnPage = false;
    }

    __setupLighting (){
        this.lighting = new LIGHTS();
        this.lighting.lights.forEach(light => {
            light.layers.enable(0);
            this.scene.add(light)
        });

        if( CONFIG.LIGHT_DEBUG) {
            this.lighting.setupLightGUI(this.target_element);
        }
    }
    __update(){
        this.controls.update();
    }
    __render() {
        this.renderer.render( this.scene, this.camera );
        if(!CONFIG.CONTEXT_MOBILE){
            this.pickHelper.pick(this.pickHelper.pickPosition, this.scene, this.camera);
        }


        //Picking must happen after rendering
        if(!CONFIG.CONTEXT_MOBILE){
            this.pickHelper.fireEvents(this.fire_event_to_component, this.camera, this.renderer);
        }


        //WISHLIST Change this for touch events as well 1/21/20
        if(this.__state_mouse_handle_click_event){
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, keyboard.pressed("shift"))
            }

            this.__state_mouse_handle_click_event = false; //Clears mouse event on handle
        }

        if(this.__state_mouse_handle_contextmenu_event){
            //WISHLIST context menu handling
            //We should add handling for a context enum that can handle different context situations and obj interactions.
            if(!CONFIG.CONTEXT_MOBILE){
                this.pickHelper.handle_click_selection(this.__state_mouse_handle_click_event, true, true);
                this.fire_event_to_component(ENGINE_EVENTS.contextmenu_selected_uuids, this.pickHelper.selection.map(o => o.obj.uuid));
            }

            this.__state_mouse_handle_contextmenu_event = false;
        }
    }

    ___setupController(){
        let viewerScope = this;
        this.controller = {
            //External facing functions for controling the scene from the viewer layout Vue component.
            //These functions need to be bound, but the Viewer Vue layer handles that in the engine interface setup anyways.

            resetCamera: function (){
                this.controls.reset();

                requestAnimationFrame(function resetCamera_rerender(ts){
                    viewerScope.rerender(ts, "resetCamera");
                });
            },

            view_RIGHT: function(){
                //Get current center, based on the right click panning around
                let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
                this.camera.position.set(0,-dist,0);

                this.camera.lookAt(new THREE.Vector3(0,0,0));
                this.camera.up = new THREE.Vector3(0,0,1);

                requestAnimationFrame(function view_RIGHT_rerender(ts){
                    viewerScope.rerender(ts, "view_RIGHT");
                });
            },

            view_LEFT: function(){
                //Get current center, based on the right click panning around
                let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
                this.camera.position.set(0,dist,0);

                this.camera.lookAt(new THREE.Vector3(0,0,0));
                this.camera.up = new THREE.Vector3(0,0,1);

                requestAnimationFrame(function view_LEFT_rerender(ts){
                    viewerScope.rerender(ts, "view_LEFT");
                });
            },

            view_TOE_END: function(){
                let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
                this.camera.position.set(dist,0,0);

                this.camera.lookAt(new THREE.Vector3(0,0,0));
                this.camera.up = new THREE.Vector3(0,0,1);

                requestAnimationFrame(function view_TOE_END_rerender(ts){
                    viewerScope.rerender(ts, "view_TOE_END");
                });
            },

            view_HEEL_END: function(){
                let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
                this.camera.position.set(-dist,0,0);

                this.camera.lookAt(new THREE.Vector3(0,0,0));
                this.camera.up = new THREE.Vector3(0,0,1);

                this.rerender("view_HEEL_END");

                requestAnimationFrame(function view_HEEL_END_rerender(ts){
                    viewerScope.rerender(ts, "view_HEEL_END");
                });
            },

            view_TOP: function(){
                let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
                this.camera.position.set(0,0,dist);

                this.camera.lookAt(new THREE.Vector3(0,0,0));
                this.camera.up = new THREE.Vector3(1,0,0);

                requestAnimationFrame(function view_TOP_rerender(ts){
                    viewerScope.rerender(ts, "view_TOP");
                });
            },

            view_BOTTOM: function(){
                let dist = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
                this.camera.position.set(0,0,-dist);

                this.camera.lookAt(new THREE.Vector3(0,0,0));
                this.camera.up = new THREE.Vector3(1,0,0);

                requestAnimationFrame(function view_BOTTOM_rerender(ts){
                    viewerScope.rerender(ts, "view_BOTTOM");
                });
            },

            //Use bounding box to determine default rotation, then landmark to determine vertical orrientation?

            hideLandmarks : function() {
                viewerScope.camera.layers.toggle(CONFIG.LAYERS_LANDMARKS);

                requestAnimationFrame(function hideLandmarks_rerender(ts){
                    viewerScope.rerender(ts, "hideLandmarks");
                });
            },
        };
    }


    ___HOTFIX_axesHelperVisibility(){
        // The axes helper has an issue with being invisible on the first draw for some reason.
        // Don't know why threejs will draw it after a visibility toggle so hopefully this hotfix is enough for now.
        const toggleAll = () => {
            this.scene_manager.mapOverTopObjs(o => this.scene_manager.toggleVisibility(o.uuid));
            this.rerender("toggleVisibility");
            //TODO fix visibilty toggle not handling landmarks and circumference children
        }

        toggleAll();
        this.__render();
        toggleAll();
        this.__render();
    }

    //TODO this should be shoved down to the scene manager
    //SCENE MANAGER
    //All functions should call __manager_flush_change() to propagate a scene graph representation model change
    //in the Layout level.
    //


    // CRITICAL EVENT LAYER
    // This handles telling the viewer layout to query for a new version of the scene graph model.
    __manager_flush_change (force=false){
        //Setters applied to managed items can set the flush flag to true
        if(force){
            this.fire_event_to_component(ENGINE_EVENTS.viewer_scene_graph_change);
            this.scene_manager.flush_flag = false;
        }
    }



}

export default ViewerEngine;

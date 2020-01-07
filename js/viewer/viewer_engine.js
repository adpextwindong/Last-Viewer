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
        obj: null,
        LIGHT_DEBUG: true,
        //function to emit event to the containing Vue component
        fire_event_to_component: null,

        init: function (target_element, component_event_emitter, processed_loadGraphList) {
            //Have the loadGraph object expose a function for returning a list of its top level objs so we can forEach scene.add them

            const applyConfig = g => {
                if(g.config){
                    //iterate and pattern match on properties
                    Object.entries(g.config).forEach(entry => {
                        let key = entry[0];
                        let value = entry[1];

                        if(key === "position"){
                            let {x,y,z} = value;
                            g.response_object.obj.position.set(x,y,z);
                        }else if(key === "material_color"){
                            //This 0 index might be too hard coded
                            g.response_object.obj.children[0].material.emissive.setHex(value);
                        }else{
                            console.log("undefined setting pattern match " + key + " " + value);
                        }
                    })
                }
                if(g.overlay_children){
                    g.overlay_children.forEach(child => applyConfig(child));
                }
            }
            processed_loadGraphList.forEach(g => applyConfig(g));

            //SCENE
            this.objs = processed_loadGraphList.map(g => g.response_object.obj);
            //TODO apply configs to objs

            this.scene = new THREE.Scene();
            this.objs.forEach(o =>{
                this.scene.add( o );
            });
            
            this.fire_event_to_component = component_event_emitter;
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
                let max_mesh_width = Math.max.apply(Math, this.objs.map(o =>{
                    o.children[0].geometry.computeBoundingBox();
                    return o.children[0].geometry.boundingBox.getSize();
                }).map(v => v.x));
    
                //Position the foot objs across the X axis in a distributed manner.
                for(let i = 0; i < this.objs.length; i++){
                    this.objs[i].position.set(((-max_mesh_width*this.objs.length)/2) + i*max_mesh_width, -50, -50);
                    this.objs[i].rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);
                }
            }
            
            var axesHelper = new THREE.AxesHelper( 1000 );
            this.scene.add( axesHelper );

            // var helper = new THREE.CameraHelper( this.camera );
            // this.scene.add( helper );

            this.__setupLighting(target_element);

            this.renderer = new THREE.WebGLRenderer( {antialias:config_ANTI_ALIASING, alpha : true});
            this.renderer.setSize( screen_width, screen_height );
           
            THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
            // CONTROLS
            this.controls = new TrackballControls( this.camera, this.renderer.domElement );
            this.controls.maxDistance = config_MAX_DISTANCE;
            
            // EVENTS
            THREEx.ResizeForWidthOffset(this.renderer, this.camera, target_element, this.controls);

            this.__appendRendererToDom(target_element);
            //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
            window.dispatchEvent(new Event('resize'));
            this.controls.handleResize();

            this.pickHelper = new PickHelper();
            this.pickHelper.clearPickPosition();

            // Object Picking Events
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

        //Prepend the webgl renderer domElement to the app's div.
        __prependRendererToDom : function (target_element) {
            target_element.prepend( this.renderer.domElement );
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
            if ( keyboard.pressed("z") ) 
            {

            }

            this.controls.update();
        },
        __render: function () {
            this.renderer.render( this.scene, this.camera );
            this.pickHelper.pick(this.pickHelper.pickPosition, this.scene, this.camera);

            //Picking must happen after rendering
            this.pickHelper.fireEvents(this.fire_event_to_component, this.camera, this.renderer);
        },

        //External facing functions for controling the scene from the viewer?layout Vue component.
        resetCamera: function (){
            //TODO fix this
            this.camera.position.set(0, 0, 500);
            this.camera.lookAt(this.scene.position);
        },

        hideLandmarks : function() {
            //Toggle visisbilty to all meshes not named "foot"
            //TODO this might have to change for non foot models
            this.objs.forEach(o => {
                o.children.forEach(c => {
                    if(c.name !== "foot"){
                        c.visible = !c.visible;
                    }
                });
            });
        }
    };
};
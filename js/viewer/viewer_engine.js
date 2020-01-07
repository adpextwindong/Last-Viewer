var THREE = require('three');
var TrackballControls = require('three-trackballcontrols');
var LIGHTS = require('./lights.js');
var keyboard = new THREEx.KeyboardState();

//CONFIG
//disable this for now as its slow
const config_ANTI_ALIASING = false;
//Limit zoom out distance
const config_MAX_DISTANCE = 1000;

class PickHelper {
    constructor() {
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = undefined;
      this.pickedObjectSavedColor = 0;

      this.pickPosition = {x: 0, y: 0};

    //Event handling for fireEvents()
      this.lastEmittedPickedObject = undefined;
      this.triggerHoverOffForLastEmitted = true;
    }
    pick(normalizedPosition, scene, camera) {
      // restore the color if there is a picked object
      if (this.pickedObject) {
        if(this.pickedObject !== undefined){
            this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
        }
        this.pickedObject = undefined;
      }

      // cast a ray through the frustum
      this.raycaster.setFromCamera(normalizedPosition, camera);
      // get the list of objects the ray intersected
      //collect all the children of the group (scan) objects and intersect them

      //FIXME assumes all top level Group objects have only a single layer of children
      //This should go through the whole scene graph for groups
      
      const collectGroupChilds = (o => {
          let xs = [];
          if(o.children){
                // push children objects onto xs
                xs.push(... o.children.filter(c => c.type !== "Group"));
                // Recurse onto Group child objects
                xs.push(... o.children.filter(c => c.type === "Group").flatMap(collectGroupChilds));
          }
          return xs;
      });

      //AxesHelper cannot be highlighted
      const intersectedObjects = this.raycaster.intersectObjects(collectGroupChilds(scene).filter(obj => obj.constructor.name !== "AxesHelper"));

      //Replace this with a function that recursively grabs all the nonGroup children of a tree and traverses the child groups for their children objects
    //   const intersectedObjects = this.raycaster.intersectObjects(scene.children.filter(c => c.type == "Group").flatMap(g => g.children));
      if (intersectedObjects.length) {
        // pick the first object. It's the closest one
        this.pickedObject = intersectedObjects[0].object;
        // save its color
        this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
        // set its emissive color to flashing red/yellow
        this.pickedObject.material.emissive.setHex(0xFF0000);
      }else{
        this.pickedObject = undefined;
      }
    }
    getCanvasRelativePosition(e, render_domElement) {
        const rect = render_domElement.getBoundingClientRect();
        return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        };
    }
    
    setPickPosition(e, render_domElement) {
        const pos = this.getCanvasRelativePosition(e, render_domElement);
        this.pickPosition.x = (pos.x / render_domElement.clientWidth ) *  2 - 1;
        this.pickPosition.y = (pos.y / render_domElement.clientHeight) * -2 + 1;  // note we flip Y
    }
    
    clearPickPosition() {
        // unlike the mouse which always has a position
        // if the user stops touching the screen we want
        // to stop picking. For now we just pick a value
        // unlikely to pick something
        this.pickPosition.x = -100000;
        this.pickPosition.y = -100000;
    }

    fireEvents(fire_event_to_component, camera, renderer){
        //Event names should be centralized between engine and layout.
        if(this.pickedObject !== this.lastEmittedPickedObject){
            if(this.triggerHoverOffForLastEmitted){
                if(this.lastEmittedPickedObject){
                    fire_event_to_component("viewer_landmark_hover_off",
                        this.lastEmittedPickedObject.parent["name"] ,this.lastEmittedPickedObject.name);
                }
                
                this.triggerHoverOffForLastEmitted = false;
            }

            if(this.pickedObject){
                fire_event_to_component("viewer_landmark_hover_on",
                    this.pickedObject.parent["name"] ,this.pickedObject.name);

                this.lastEmittedPickedObject = this.pickedObject;
                this.triggerHoverOffForLastEmitted = true;
            }
        }
        
        if(this.pickedObject){
            this.pickedObject.geometry.computeBoundingSphere();
            let mesh_center = this.pickedObject.geometry.boundingSphere.center.clone();

            // 01 06 20 TODO
            //Refactor this for multi obj handling
            this.pickedObject.updateMatrixWorld(true);
            mesh_center.applyMatrix4(this.pickedObject.matrixWorld);
            camera.updateMatrixWorld(true)
            let vector = mesh_center.project(camera);

            fire_event_to_component("viewer_landmark_highlighted_position", { 
                x: ((vector.x / 2) * renderer.domElement.width) + (renderer.domElement.width/2),
                y: (renderer.domElement.height/2) - ((vector.y / 2) * renderer.domElement.height) 
            });
        }
    }
  }

module.exports = function () {
    return {
        obj: null,
        LIGHT_DEBUG: true,
        //function to emit event to the containing Vue component
        fire_event_to_component: null,

        init: function (target_element, component_event_emitter, objs) {
            //TODO refactor scan_objs and insole_objs into a loadGraph object with its own javascript file
            //Have the loadGraph object expose a function for returning a list of its top level objs so we can forEach scene.add them

            //SCENE
            this.objs = objs;

            this.scene = new THREE.Scene();
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

            let max_mesh_width = Math.max.apply(Math, this.objs.map(o =>{
                o.children[0].geometry.computeBoundingBox();
                return o.children[0].geometry.boundingBox.getSize();
            }).map(v => v.x));

            //Position the foot objs across the X axis in a distributed manner.
            for(let i = 0; i < this.objs.length; i++){
                this.objs[i].position.set(((-max_mesh_width*this.objs.length)/2) + i*max_mesh_width, -50, -50);
                this.objs[i].rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);
            }

            //is building the scene graph a obj load time detail or should that be left to the engine?
            this.objs.forEach(o =>{
                this.scene.add( o );
            });
            
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
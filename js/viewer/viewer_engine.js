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
      const intersectedObjects = this.raycaster.intersectObjects(scene.children[1].children);
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
  }

module.exports = function () {
    return {
        obj: null,
        LIGHT_DEBUG: true,
        //function to emit event to the containing Vue component
        fire_event_to_component: null,
        lastEmittedPickedObject: undefined,
        triggerHoverOffForLastEmitted: true,

        init: function (target_element, scan_obj, component_event_emitter) {
            //SCENE
            this.obj = scan_obj;
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

            var mesh = this.obj.getObjectByName("foot", false);
            this.obj.position.set(-125, -50, -50);
            this.obj.rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);

            //mesh.material = new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } );
            mesh.material.color.set(0xcccccc);	//.set(new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } ));
            //mesh.material.ambient.set(0xdddddd);
            //mesh.material.specular.set(0xffffff);
            //mesh.material.shininess.set(10);
            this.scene.add( this.obj );

            var axesHelper = new THREE.AxesHelper( 1000 );
            this.scene.add( axesHelper );

            this.lighting = new LIGHTS();
            this.lighting.init();
            this.lighting.lights.forEach(light => this.scene.add(light));

            this.renderer = new THREE.WebGLRenderer( {antialias:config_ANTI_ALIASING, alpha : true});
            this.renderer.setSize( screen_width, screen_height );
           
            THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });
            // CONTROLS
            this.controls = new TrackballControls( this.camera, this.renderer.domElement );
            this.controls.maxDistance = config_MAX_DISTANCE;
            
            // EVENTS
            THREEx.ResizeForWidthOffset(this.renderer, this.camera, target_element, this.controls);

            if( this.LIGHT_DEBUG) {
                this.lighting.setupLightGUI(target_element);
            }

            this.__appendRendererToDom(target_element);
            //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
            window.dispatchEvent(new Event('resize'));
            this.controls.handleResize();

            this.pickHelper = new PickHelper();
            this.pickHelper.clearPickPosition();

            //FIXME Hacky implementation
            //This is a hack around window binding itself to the this keyword on callback

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

        __update: function ()
        {
            if ( keyboard.pressed("z") ) 
            {
                if(this.pickHelper.pickedObject !== undefined){
                    console.log("lets try again");

                    this.pickHelper.pickedObject.geometry.computeBoundingSphere();
                    let test = this.pickHelper.pickedObject.geometry.boundingSphere.center.clone();

                    this.obj.updateMatrixWorld(true);
                    test.applyMatrix4(this.obj.matrixWorld);
                    this.camera.updateMatrixWorld(true)
                    let vector = test.project(this.camera);

                    // console.log(vector);
                    console.log({ 
                        x: ((vector.x / 2) * this.renderer.domElement.width) + (this.renderer.domElement.width/2),
                        y: (this.renderer.domElement.height/2) - ((vector.y / 2) * this.renderer.domElement.height) 
                    });
                }

            }

            this.controls.update();
        },
        __render: function () {
            this.renderer.render( this.scene, this.camera );
            this.pickHelper.pick(this.pickHelper.pickPosition, this.scene, this.camera);

            //TODO this state machine should be made cleaner.
            //Initialization of the undefined states should be done in the constructor
            //Event names should be centralized between engine and layout.
            if(this.pickHelper.pickedObject !== this.lastEmittedPickedObject){
                if(this.triggerHoverOffForLastEmitted){
                    if(this.lastEmittedPickedObject !== undefined){
                        this.fire_event_to_component("viewer_landmark_hover_off",this.lastEmittedPickedObject.name);
                    }
                    
                    this.triggerHoverOffForLastEmitted = false;
                }

                if(this.pickHelper.pickedObject !== undefined){
                    this.fire_event_to_component("viewer_landmark_hover_on",this.pickHelper.pickedObject.name);
                    this.lastEmittedPickedObject = this.pickHelper.pickedObject;
                    this.triggerHoverOffForLastEmitted = true;
                }
            }
        },

        //External facing functions for controling the scene from the viewer?layout Vue component.
        resetCamera: function (){
            this.camera.position.set(0, 0, 500);
            this.camera.lookAt(this.scene.position);
        },

        hideLandmarks : function() {
            this.obj.children.forEach(c => {
                if(c.name !== "foot"){
                    c.visible = !c.visible;
                }
            });
        }
    };
};
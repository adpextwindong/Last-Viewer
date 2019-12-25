var THREE = require('three');
var TrackballControls = require('three-trackballcontrols');
var LIGHTS = require('./lights.js');

// standard global variables
// var container;
// var scene, camera, renderer, controls;
var keyboard = new THREEx.KeyboardState();

//CONFIG
//disable this for now as its slow
const config_ANTI_ALIASING = false;
//Limit zoom out distance
const config_MAX_DISTANCE = 1000;
module.exports = function () {
    return {
        obj: null,
        LIGHT_DEBUG: true,

        init: function (target_element, scan_obj) {
            //SCENE
            this.obj = scan_obj;
            this.scene = new THREE.Scene();
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

            // TODO load foot obj seperately from the viewer as it will be part of an api call.
            var mesh = this.obj.getObjectByName("foot", false);
            // mesh.position.set(-125, -50, -50);
            // mesh.rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);
            this.obj.position.set(-125, -50, -50);
            this.obj.rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);

            //mesh.material = new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } );
            mesh.material.color.set(0xcccccc);	//.set(new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } ));
            //mesh.material.ambient.set(0xdddddd);
            //mesh.material.specular.set(0xffffff);
            //mesh.material.shininess.set(10);
            this.scene.add( this.obj );

            this.lighting = new LIGHTS();
            this.lighting.init();
            this.lighting.lights.forEach(light => this.scene.add(light));

            //todo finish migrating
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
            //TODO enable controls

            this.__appendRendererToDom(target_element);
            //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
            window.dispatchEvent(new Event('resize'));
            this.controls.handleResize();
        },

        //TODO change this RAF architecture to not redraw unless a change in the scene happens.
        animateLoop: function () 
        { 
            requestAnimationFrame( this.animateLoop.bind(this) );
            this.__render();		
            this.__update();
        },
        // getRendererDOMElem : function () {
        //     return this.renderer.domElement;
        // },

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
                // do something
            }

            this.controls.update();
        },
        __render: function () {
            this.renderer.render( this.scene, this.camera );
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
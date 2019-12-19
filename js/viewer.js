// standard global variables
// var container;
// var scene, camera, renderer, controls;
var keyboard = new THREEx.KeyboardState();

//CONFIG
//disable this for now as its slow
const config_ANTI_ALIASING = false;
const config_MAX_DISTANCE = 1000;
//Limit zoom out distance
let config_obj_url = './data/foot1.obj';

var Lighting = {
    init: function () {
        this.lights = [
        new THREE.AmbientLight( 0x404040 ), // soft white light
        new THREE.DirectionalLight( 0xffffff, 0.5 ),
        new THREE.DirectionalLight( 0xffffff, 0.5 ),
        new THREE.DirectionalLight( 0xffffff, 0.5 ),
        new THREE.DirectionalLight( 0xffffff, 0.5 ),
        ];

        this.lights[1].position.set( 0, 0, 1000);
        this.lights[2].position.set( 0, 0, -1000);
        this.lights[3].position.set( 0, -1000, 0);
        this.lights[4].position.set( 0, 1000, 0);
        //todo finish seting up the light positions
    },

    setupLightGUI : function () {
        lights_gui = new dat.GUI({closed:true});

        lights_gui.add(this.lights[1], 'intensity', 0.0, 1.0);
        lights_gui.add(this.lights[2], 'intensity', 0.0, 1.0);
        lights_gui.add(this.lights[3], 'intensity', 0.0, 1.0);
        lights_gui.add(this.lights[4], 'intensity', 0.0, 1.0);

        lights_gui.add(this.lights[0].color, 'r');
        lights_gui.add(this.lights[0].color, 'g');
        lights_gui.add(this.lights[0].color, 'b');
    }
};

var Viewer = {
    init: function () {
        //Viewer state variables

        //SCENE
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

        //TODO load foot obj seperately from the viewer as it will be part of an api call.
        var loader = new THREE.OBJLoader();
        loader.load(
            config_obj_url,
            ( obj ) => {  // 読み込み完了時のコールバック関数
                var mesh = obj.getObjectByName("foot", false);
                mesh.position.set(-125, -50, -50);
                mesh.rotation.set(-90*Math.PI/180, 0, -90*Math.PI/180);
                //mesh.material = new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } );
                mesh.material.color.set(0xcccccc);	//.set(new THREE.MeshPhongMaterial( { color: 0xff0000, ambient:0xff0000, specular: 0xffffff, shininess:10 } ));
                mesh.material.ambient.set(0xdddddd);
                //mesh.material.specular.set(0xffffff);
                //mesh.material.shininess.set(10);
                
                this.scene.add( obj );
                //TODO move this out, emit event or something. Listen for load complete
                //PRESENTATION
                document.querySelector("#state").innerHTML = "";
            }
        );

        this.lighting = Lighting;
        this.lighting.init();
        this.lighting.setupLightGUI();
        this.lighting.lights.forEach(light => this.scene.add(light));

        //todo finish migrating
        this.renderer = new THREE.WebGLRenderer( {antialias:config_ANTI_ALIASING});
        this.renderer.setSize( screen_width, screen_height );



        // EVENTS
        THREEx.WindowResize(this.renderer, this.camera);
        //Trigger resize so the canvas is laid out correctly on the first viewing of the page.
        window.dispatchEvent(new Event('resize'));
        THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

        // CONTROLS
        this.controls = new THREE.TrackballControls( this.camera, this.renderer.domElement );
        this.controls.maxDistance = config_MAX_DISTANCE;

        this.appendRendererToDom();
    },

    appendRendererToDom : function () {
        //PRESENTATION
        //TODO handle this rendering differently
        container = document.createElement( 'div' );
        document.body.appendChild( container );
        container.appendChild( this.renderer.domElement );
    },

    animateLoop: function () 
    { 
        requestAnimationFrame( this.animateLoop.bind(this) );
        this.render();		
        this.update();
    },

    update: function ()
    {
        if ( keyboard.pressed("z") ) 
        { 
            // do something
        }

        this.controls.update();
        //stats.update();
    },
    render: function () {
        this.renderer.render( this.scene, this.camera );
    },
};

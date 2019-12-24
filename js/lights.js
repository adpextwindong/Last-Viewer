const THREE = require('three');
const dat = require('dat.gui');

module.exports = function() {
    return {
        init: function () {
            //TODO unhardcode these positions and read from localstorage or something
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

        setupLightGUI : function (target_element) {
            lights_gui = new dat.GUI({autoPlace: false, closed:true});

            lights_gui.add(this.lights[1], 'intensity', 0.0, 1.0);
            lights_gui.add(this.lights[2], 'intensity', 0.0, 1.0);
            lights_gui.add(this.lights[3], 'intensity', 0.0, 1.0);
            lights_gui.add(this.lights[4], 'intensity', 0.0, 1.0);

            lights_gui.add(this.lights[0].color, 'r');
            lights_gui.add(this.lights[0].color, 'g');
            lights_gui.add(this.lights[0].color, 'b');

            target_element.appendChild( lights_gui.domElement );
        }
    }
}
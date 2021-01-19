const THREE = require('three');
const dat = require('dat.gui');

const CONFIG = require('../config');

module.exports = function() {
    return {
        init: function () {
            let storage = window.localStorage;
            let xs = [1,2,3,4];

            let luminosity_values = Array(5);
            xs.forEach(x => {
                let propertyName = "viewer_light" + x + "_luminosity";
                let storage_value = storage.getItem(propertyName);

                if(storage_value !== undefined && isNaN(parseFloat(storage_value)) !== true ){
                    luminosity_values[x] = parseFloat(storage_value);
                    // console.log("Using localstorage for light "+x);
                }else{
                    //default on failure
                    // console.log("Falling back to CONFIG "+propertyName);
                    luminosity_values[x] = CONFIG[propertyName];
                    // console.log(CONFIG[propertyName]);
                }
            });

            this.lights = [
            new THREE.AmbientLight( CONFIG.AMBIENT_LIGHT_COLOR ),
            new THREE.DirectionalLight( 0xffffff, luminosity_values[1]),
            new THREE.DirectionalLight( 0xffffff, luminosity_values[2]),
            new THREE.DirectionalLight( 0xffffff, luminosity_values[3]),
            new THREE.DirectionalLight( 0xffffff, luminosity_values[4]),
            ];

            this.lights[1].position.set( 0, 0, 1000);
            this.lights[2].position.set( 0, 0, -1000);
            this.lights[3].position.set( 0, -1000, 0);
            this.lights[4].position.set( 0, 1000, 0);
        },

        setupLightGUI : function (target_element) {
            this.lights_gui = new dat.GUI({autoPlace: false, closed:true});

            this.luminosity_controllers = [];

            this.luminosity_controllers.push(this.lights_gui.add(this.lights[1], 'intensity', 0.0, 1.0));
            this.luminosity_controllers.push(this.lights_gui.add(this.lights[2], 'intensity', 0.0, 1.0));
            this.luminosity_controllers.push(this.lights_gui.add(this.lights[3], 'intensity', 0.0, 1.0));
            this.luminosity_controllers.push(this.lights_gui.add(this.lights[4], 'intensity', 0.0, 1.0));

            this.luminosity_controllers.forEach((controller, index) => {
                // console.log("Strapping up the onFinishChange");
                controller.onFinishChange(function(value){
                    // console.log("Firing finish change "+ "viewer_light" + (index+1) + "_luminosity");
                    let propertyName = "viewer_light" + (index+1) + "_luminosity";
                    let storage = window.localStorage;
                    storage.setItem(propertyName, value);
                });
            });

            this.lights_gui.add(this.lights[0].color, 'r');
            this.lights_gui.add(this.lights[0].color, 'g');
            this.lights_gui.add(this.lights[0].color, 'b');

           this.append_gui(target_element);
        },

        append_gui : function(target_element){
            target_element.appendChild( this.lights_gui.domElement );
        },
        shutdown : function(){
            if(CONFIG.LIGHT_DEBUG){
                this.lights_gui.domElement.remove();
            }
        }
    }
}

//WISHLIST PREDEPLOYMENT spit out json for all these values so we can update the config.js file
const DEFAULTS = {
    ///
    /// APP
    ///

    DEBUG : true,
    ///
    ///ENGINE
    ///
    ANTI_ALIASING : false,
    ALPHA : true,
    //Zoom out Distance
    MAX_DISTANCE : 1000,
    LIGHT_DEBUG : false,
    //OBJ orrientation
    DEFAULT_ROTATION_X : -90*Math.PI/180,
    DEFAULT_ROTATION_Y : 0,
    DEFAULT_ROTATION_Z : -90*Math.PI/180,

    //Disables mouse picking when true
    CONTEXT_MOBILE : false,

    //Mouse interaction features
    CONTEXT_MENU_ENABLED : false,

    ///
    /// PICK HELPER
    ///
    SELECTION_COLOR : 0xFFA500,
    PICKING_COLOR : 0xFF0000,

    ///
    /// Lights
    ///
    viewer_light1_luminosity : 0.5,
    viewer_light2_luminosity : 0.5,
    viewer_light3_luminosity : 0.5,
    viewer_light4_luminosity : 0.5,

    AMBIENT_LIGHT_COLOR : 0x404040,

    LAYERS_SCANS : 1,
    LAYERS_LANDMARKS : 2,
    LAYERS_MEASUREMENT_LINES : 3,

    INSTEP_PERCENT_OF_FOOT : 0.55, //should be float from [0.0 to 1.0]
};

//This might end up in Vuex, not sure because of performance overhead.
//For now it should be instantiated with expectations of it being globally declared
//Like this:
//
//import configuration from "configuration";
//var CONFIG = CONFIG || new configuration();

//THIS SHOULD ONLY BE USED INSIDE THE ENGINE
class configuration{
    constructor(config){
        if(config === undefined){
            Object.assign(this, DEFAULTS);
        }else{
            Object.assign(this, config);
        }
    }
    downloadConfig(){
    }
}

export default configuration;

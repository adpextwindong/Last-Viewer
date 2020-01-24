//TODO convert the existing localstorage related code to serialize to a file
//This should just be a simple utility for fetching from that file
//Load from config or save localStorage version should be offered from the setting page.
// {

//     lights :{

//     }
//     engine :{

//     }
// }

module.exports = {
    ///
    ///ENGINE
    ///
    ANTI_ALIASING : false,
    //Zoom out Distance
    MAX_DISTANCE : 1000,
    LIGHT_DEBUG : true,
    //OBJ orrientation
    DEFAULT_ROTATION_X : -90*Math.PI/180,
    DEFAULT_ROTATION_Y : 0,
    DEFAULT_ROTATION_Z : -90*Math.PI/180,

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
    
}
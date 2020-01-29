module.exports = {
    //TODO make this a utility that parses a json file at runtime so we dont have to recompile.
    ///
    /// APP
    ///
    DEFAULT_LOCALE : "en",
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
    
}
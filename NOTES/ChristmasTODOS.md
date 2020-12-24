--------------------------------------------------------------------------------
TODOS as of Thu, Dec 24, 2020  2:04:45 PM
--------------------------------------------------------------------------------

app.js:21://TODO make this runtime configurable
components/scan_selector.js:3://TODO rename this or something
components/scan_selector.js:97:            //TODO add scheme naming to these things.
components/scan_selector.js:205:        //TODO conver this to funnel into LoadTreeViewer
components/scan_selector.js:226:                  //TODO These createObjectURLS need to be freed eventually

components/viewer/scene_graph_hiearchy.js:59:                    //TODO fix this

components/viewer/viewer_layout.js:139:                //TODO viewerScope.rerender();
components/viewer/viewer_layout.js:167:            //TODO the scene manager should be handling ownership/managment of this processed_loadTreeList variable

components/viewer/view_controls.js:9:            //TODO TASK REMAINING VIEW TRANSLATIONS

engine/lights.js:80://TODO TASK PREDEPLOYMENT spit out json for all these values so we can update the config.js file

engine/pick_helper.js:109:        //TODO TASK Line Highlighting.

engine/resource_manager.js:23://TODO refactor parts of this class so its more readable and consistent in naming
engine/resource_manager.js:62:            //TODO make this togleable
engine/resource_manager.js:213:            //TODO Make this a constant
engine/resource_manager.js:249:    //TODO fix these circumference interactions with the model (or parent model) being rotated.

engine/viewer_engine.js:76:            this.__appendRendererToDom();
engine/viewer_engine.js:81:            //TODO add a flag for this
engine/viewer_engine.js:101:            //TODO maybe these need to force rerender this.rerender();
engine/viewer_engine.js:161:            //TODO TASK TESTING Touch stuff needs to be tested on mobile
engine/viewer_engine.js:189:        //TODO debug all UI interactions to force rerender, and finalize RAF architecture removal
engine/viewer_engine.js:190:        //TODO debug why this hangs on Android
engine/viewer_engine.js:199:        //TODO include a flag that any UI/Touch event forces true that causes a rerender.
engine/viewer_engine.js:208:        __appendRendererToDom : function () {
engine/viewer_engine.js:214:            this.__appendRendererToDom();
engine/viewer_engine.js:294:        //TODO rename these EXTERNAL
engine/viewer_engine.js:295:        //TODO these all force rerender
engine/viewer_engine.js:384:                //TODO fix visibilty toggle not handling landmarks and circumference children

loader/dimensions_parser.js:1://TODO import zip from utils

loader/landmark_parser_utils.js:22:        //TODO TASK PREDEPLOYMENT figure out what we should do with the "This file was created by FileConverter" description.

loader/load_tree_helper.js:78:        //Scan type TODO REFACTOR THIS NAME
loader/load_tree_helper.js:83:        //TODO error log on invalid filetype
loader/load_tree_helper.js:108:    //TODO refactor the load state handling into seperate predicate and state transition functions
loader/load_tree_helper.js:113:        //TODO CRITICAL SECTION FOR STL PATCH
loader/load_tree_helper.js:115:        //TODO play with the STLLoader.js load function to see what it spits back
loader/load_tree_helper.js:117:        //TODO test the behavior of the stl loader to see if we can reuse this closure
loader/load_tree_helper.js:148:                //TODO on load
loader/load_tree_helper.js:152:                //TODO find a better mesh basic material
loader/load_tree_helper.js:166:            //TODO put in the stl handler
loader/load_tree_helper.js:197:    //TODO consider moving this into the scene manager

store/modules/landmarks.js:22://TODO consider pushing this landmark loading into a LOADER class so the landmarks text file handling is inline w/ OBJ loading
store/modules/landmarks.js:24:    //TODO make this more robust for when the model doesnt have landmarks

--------------------------------------------------------------------------------

WISHLIST

--------------------------------------------------------------------------------

components/scan_selector.js:180:            //WISHLIST REFACTOR ASYNC LOADER (this needs to be replaced with a totally async web worker based loader so it doesnt load things in serial)
components/scan_selector.js:209:            //WISHLIST file validation and error handling

components/viewer/scene_graph_hiearchy.js:41:        //WISHLIST handling should be moved elsewhere, its convient for debugging to do it drag&drop like this for now.
components/viewer/scene_graph_hiearchy.js:46:            //WISHLIST file validation and error handling

components/viewer/viewer_layout.js:178:            //WISHLIST Refactor RAF loop

engine/resource_manager.js:193:        //WISHLIST See if projecting down is all we need
engine/resource_manager.js:222:        //WISHLIST LINE PICKING/HOVERING now make the line be pickable/hoverable
engine/resource_manager.js:389:            //WISHLIST consider adding functionality to extend past to a certain distance for stuff like Toe Angle Base Lines

engine/viewer_engine.js:82:            //WISHLIST GPU PICKING
engine/viewer_engine.js:128:                //WISHLIST add a flag to the contextmenu handler to check for a mouse move of a certain distance?
engine/viewer_engine.js:270:            //WISHLIST Change this for touch events as well 1/21/20
engine/viewer_engine.js:280:                //WISHLIST context menu handling

loader/landmark_parser_utils.js:36:            //WISHLIST maybe make a lookup table for these.

loader/load_tree_helper.js:107:    //WISHLIST refactor This needs to be decoupled from the current loader

# Project Architecture Documentation

TODO REWRITE THIS FOR THE MIGRATION

foot_viewer.html and App.js is the entry point for this Scan Model Viewer. App.js contains a small VueRouter for the settings, base page and engine page.

## File & Folder Layout

assets/
    Static assets to be handled by webpack.
components/
    Components for use by Vuejs Views.
engine/
    Any and all engine related code goes here. Configured by config.js
    Viewer Engine attachs to a domElement given to it.
    scene_manager.js handles external controls for CHANGING the scene.
    The Viewer Engine controller object is an interface to MANIPULATING the scene's objects.
loader/
    Handles all loading of files. PENDING REFACTOR
router/
    Sets up the inital route.
store/
    VUEX Store for Application wide settings and things that need to be watched by Views/Components such as Landmarks.
styles/
    Style sheet. SCSS is preferred.
utils/
    Functional programming utils and whatnot.
views/
    Page level components that should be routed to.

## Application initilization flow

    foot_viewer.html -> App.js -> Scan Selector -> Viewer Layout (Landmark parsing, Component Event Handling creation, Engine initialization) -> Viewer Engine RAF LOOP

The Scan Selector will look for a REQUEST_METADATA js object in the global namespace. The plan is to have server side PHP inject this. If that is not found it will fall back to the debug/development purpose scan selector.

The Viewer Layout Component and Viewer Engine run concurrently due to how RequestAnimationFrame (RAF) works.

--------------------------------------------------------------------------------
## TASKS
--------------------------------------------------------------------------------

NOTE: Remaining tasks in these files will be annotated as

    TODO {REFACTOR | TASK {ADD | PREDEPLOYMENT}, } --- Predeployment tasks should be done before we push a release.
    WISHLIST --- feature backlog but comment is kept in place to note where in the code it should go.

--------------------------------------------------------------------------------
## WISHLIST
--------------------------------------------------------------------------------


GPU Picking
Context Menu development and refinement.
--------------------------------------------------------------------------------
## NOTES
--------------------------------------------------------------------------------
We might need some instrumentation to control the camera programatically, like with a script, to showcase aspects of someone's scan.

Rotate the model, highlight dimensions that are high deviation from standard. Tweening the zoom in.

TODO if we have one model we should just orbit around it to keep things simple.

Considering the scans are within a fixed size range we could tune the inital camera zoom parameters to keep the model in focus on screen.


Engine events through the fire_event_to_component event emitter should be limited to things that the Viewer Layout only needs to know. Otherwise other global application state should probably go into the model store.


Line picking can be done with a bounding box. This will have to be ported somehow for gpu picking.

--------------------------------------------------------------------------------
## 2020 CHRISTMAS TASKS AND WISHLIST
--------------------------------------------------------------------------------
### FINISHED
~~Make sure the VueJS stuff is pinned to a good version.~~
~~WISHLIST -- Push file parsing into an async web worker.~~
~~WISHLIST -- Maybe checking out TypeScript~~ NO
~~WISHLIST -- Figuring out async/await & Promises to a better degree.~~
~~Optimize load time of first paint for the engine.~~
~~Func utils like zip need to be split out and imported correctly.~~
~~We need to split out file metadata from the current load tree helper.~~ DIMENSIONS PENDING
~~Stitch scene graph might belong in the scene manager honestly. Not sure yet.~~
~~Right now any landmark texts is just stashed in the respective obj. Which is unclean, unwieldly and should be the responsibiltiy of the file loader or scene manager.~~
~~We need a lookup table for names in the objs and their respective landmarks.~~
~~Split out file loading from the scan selector component. It should handle freeing parsed files. Storing landmark texts in a parsed form.~~
~~Clean up scene manager ownership of the load tree. The current interfaces is split across the scan selector, viewer layout and viewer engine boot process and doesn't support adding scans after initial load.~~
~~Build up a file loader to handle adding scans during operation.~~
~~Seperate the boot process out of file loading so we can present a webgl canvas as soon as possible. The scan selector should end up being a component that talks to the scene manager instead of kicking off the boot process.~~
~~Clean up the load tree object crust in scan_selector. Right now theres a LoadTreeFromObject function that is very untype safe and makes no assertions about the object it accepts. We can probably use a class around loadTree or something to validate this. Or have an actual constructor.~~
~~The viewer layout shouldn't own a reference to the processed_loadTreeList in its current form like in the launchViewer method. It can't handle any errors at that layer level and it makes the scene managment/file loading structure too rigid.~~
~~Write an async parser for OBJ files that works in another thread to prevent threejs from blocking I guess.~~
~~We should see if we can make the VueX related stuff more consistent. Currently only the landmarks deal with that and might need more refactoring.~~


## TODO
### DEVOPS
See if we can do tree pruning for different builds. We don't need to ship all of the codebase for a mobile app or presentation build.

The config should be pushed to runtime to allow for toggling. Things like the pick helper don't need to be on mobile necessarily.

### Performance
Perhaps reintroduce the RAF architecture as a setting so we can handle animating/tweening a scene. Right now the change based rerendering is an optimization for phone battery life.

We need to double check rerendering costs. Right nowe we liberally rerender on mouse handlers and stuff in __bindMouseEngineEvents.

The old RAF architecture might be needed for doing spinning animations or using RAF's and having a settimeout that removes that animation event handler.

#### Load Tree Helper

Error handling and validation should be in there.

THREEJS mesh defaults could be split out into another file to keep defaults in a single spot.

#### File Loader

We need an INFOOT API layer that works well with a file loader layer.

The scan selector interface should accomodate that and be easier to use. This should consider a mobile interface too. For workstation usecases we might want to offer a tree style list to allow for layering, pairing, overlay.

Persisting a scan viewing session across open and closes.

The current 'load scheme's' should be turned into a real data type that can store a session. Then the file loader can dyn dispatch based on the paths being on disk, via API (using an iTouch API layer), or API cached on disk or something. This will have to deal with more persistence related things and VueX most likely.

The async fileDropHandler in scan selector is very similar to the stuff in scene graph hiearchy. Theres no validation either which is dangerous and its too tightly coupled with the loading and booting process. This should be split up. The drop handler can just be a standalone function that gets pointed at by a VueJS component. At worst it should be a module closure that binds a file loader handle or something. There is also freeing of createObjectURLS to be considered too.

The foot dimension data handling should work with VueX and the scene manager better to store the data. Honestly it should go through the file loader so it can get stashed/cached or something then rigged up to the respective OBJ, then plumbed into the VueJS component.

### Engine Internal Organization
We need better file metadata support to determine usable features for certain files. (ex: Landmarker vs Markerless features)

External facing engine controls should be renamed to have a consistent suffix like EXT_~~~~. It should just be packed into a single object that closures over engine internals, named ENGINE_CONTROLER with adequate documentation that these only manipulate the scene but does not manage any lifetimes. Outside of the engine we can only see two things to interact with. The engine.CONTROLS and engine.SCENE_MANAGER.

### Resource Manager
A lot of the facilities in the scene manager needs to be refactored into readable functions.


### Features
View Normals should be a toggleable feature. Currently handled by scene manager. VUEX task.
Animating the scene for presentations.
Picking and highlighting should be extended for lines/landmarks/etc for more interactability. Highlighting in respective components should support that as well.

Display dimension figures alongside their respective lines. In the wishlist theres also an idea for extending lines past landmarks in an axis for things like Toe Angle Base Lines.
#### Heuristics
    Determining foot position in local space to adjust in world space.
    Orrientation of foot position. Landmarker and Markerless heuristics for this. (ex: Long vs short sides for markerless, using quartiles to find heel position using avg max height or something)
    Left vs Right Foot (Probably requires landmarks)

    Determining if a dropped file is an insole.

### Testing

Visibility toggling should be tested. There have been issues in the past.

Touch events need to be tested.

Hopefully mouse events don't stack up and spam rerenders. This should be checked.

The landmark parser should have a test suite for it. Things like "This file was created by FileConverter" should be tossed early or pushed into metadata.

We need to see if click handling in mobile is performant enough now that the old RAF arch is removed.

## Current Organization for VueJS message passing from the Engine
On boot the engine passes the engine interface (an object containing function pointers to simple engine functions and bindings to scene manager functions)

Logging should be added to those engine interfaces. Hell we might need a simple logging framework that doesn't bog down things.

An event pipe is also passed into the viewer engine on init from the VueJS Viewer Layout layer. This should be used for top level changes of the overall viewer layout.

This engine interface is passed down to viewer components via the props system.

Any data uses between the Viewer engine and Viewer Layout children components should be facilitated by Vuex to maintain code locality. It's probably more reliable that way instead of passing stringly typed shit through the event pipe, forcing it down via prop updates or something from the Viewer Layout level.

In short the layers and interfaces are:
    - Event Pipe for ENGINE => VIEWER_LAYOUT layout changes
    - Engine Interface for VIEWER_LAYOUT & LAYOUT CHILDREN => ENGINE IO Operations
    - VueX store for component level watching of related data and operations.


TODO LOOK AT HOW THE EVENT PIPE IS CURRENTLY BEING USED.

# Project Architecture Documentation

foot_viewer.html and App.js is the entry point for this Scan Model Viewer. App.js contains a small VueRouter for the settings, base page and engine page.

## File & Folder Layout

    Store/
        Holds the Vuex data stores for anything we want to access/watch across components.
        For the bootup process of the VUE Viewer Layout and Viewer Engine. I ran into an issue where simply stashing the loadTree in global space had some sort of data race w/ the VueJS component seeing it or something. VueX simply avoids this for us but shouldn't be the primary source of truth.

        Also, this was added to avoid overloading the event handler and event bus in Vue with weakly typed data update events that are loosely defined all over the place.
        While Vuex might be overkill its simpler to have the data models defined in one place instead of having them spread everywhere.

        The fire_event_to_component handler will still be used for information from the engine that the layout should handle.

    Components/ --- VueJS components
        Top level components are directly put here.
        Viewer dir contains all the model viewer related UI components and its main layout

    Loader/ --- Loading utilities for handling a load tree and landmark parsing from obj files.

    Viewer/
        viewer_engine.js handles the ThreeJS engine context.
        resource_manager.js handles manipulating the ThreeJS scene as an interface for Viewer Layout components to interact with.

        Other files are utils for Viewer Engine and should only interact with the ThreeJS scene.

    config.js is configuration settings for the engine that is done at compile time.

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

Write an async parser for OBJ files that works in another thread to prevent threejs from blocking I guess.

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
### DEVOPS
Redo the webpack bundling process and make sure it replicatiable on Debian. Make sure the VueJS stuff is pinned to a good version.

See if we can do tree pruning for different builds. We don't need to ship all of the codebase for a mobile app or presentation build.

WISHLIST -- Push file parsing into an async web worker.

WISHLIST -- Maybe checking out TypeScript
WISHLIST -- Figuring out async/await & Promises to a better degree.

### Performance
Optimize load time of first paint for the engine.
Perhaps reintroduce the RAF architecture as a setting so we can handle animating/tweening a scene. Right now the change based rerendering is an optimization for phone battery life.
### General Organization
#### File Loader
Split out file loading from the scan selector component. It should handle freeing parsed files. Storing landmark texts in a parsed form.

We need an INFOOT API layer that works well with a file loader layer.

The scan selector interface should accomodate that and be easier to use. This should consider a mobile interface too. For workstation usecases we might want to offer a tree style list to allow for layering, pairing, overlay.

Clean up scene manager ownership of the load tree. The current interfaces is split across the scan selector, viewer layout and viewer engine boot process and doesn't support adding scans after initial load.

Build up a file loader to handle adding scans during operation.

Persisting a scan viewing session across open and closes.

Seperate the boot process out of 
### Engine Internal Organization
We need better file metadata support to determine usable features for certain files. (ex: Landmarker vs Markerless features)

### Features
Animating the scene for presentations.

Display dimension figures alongside their respective lines.
#### Heuristics
    Determining foot position in local space to adjust in world space.
    Orrientation of foot position. Landmarker and Markerless heuristics for this. (ex: Long vs short sides for markerless, using quartiles to find heel position using avg max height or something)
    Left vs Right Foot (Probably requires landmarks)

    Determining if a dropped file is an insole.
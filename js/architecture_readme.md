# Project Architecture Documentation

foot_viewer.html and App.js is the entry point for this Scan Model Viewer. App.js contains a small VueRouter for the settings, base page and engine page.

## File & Folder Layout

    Store/
        Holds the Vuex data stores for anything we want to access/watch across components.
        This was added to avoid overloading the event handler and event bus in Vue with weakly typed data update events that are loosely defined all over the place.
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

-----------------------------------------
## TASKS
-----------------------------------------

Remaining tasks in these files will be annotated as 

    TODO {REFACTOR | TASK {ADD | PREDEPLOYMENT}, } --- Predeployment tasks should be done before we push a release.
    WISHLIST --- feature backlog but comment is kept in place to note where in the code it should go.

Write an async parser for OBJ files that works in another thread to prevent threejs from blocking I guess.

-----------------------------------------
## NOTES
-----------------------------------------
We might need some instrumentation to control the camera programatically, like with a script, to showcase aspects of someone's scan.

Rotate the model, highlight dimensions that are high deviation from standard. Tweening the zoom in.

TODO if we have one model we should just orbit around it to keep things simple.

Considering the scans are within a fixed size range we could tune the inital camera zoom parameters to keep the model in focus on screen.


Engine events through the fire_event_to_component event emitter should be limited to things that the Viewer Layout only needs to know. Otherwise other global application state should probably go into the model store.


Line picking can be done with a bounding box. This will have to be ported somehow for gpu picking.
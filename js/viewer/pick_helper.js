var THREE = require('three');

const SELECTION_COLOR = 0xFFA500;
const PICKING_COLOR = 0xFF0000;

module.exports = class PickHelper {
    constructor() {
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = undefined;
      this.lastFramePickObject = undefined;
      this.pickedObjectSavedColor = 0;

      this.pickPosition = {x: 0, y: 0};

    //Event handling for fireEvents()
      this.lastEmittedPickedObject = undefined;
      this.triggerHoverOffForLastEmitted = true;

      //Selection Related handling
      this.selection = []; // [{obj, savedColor}]
      this.InSelection = o => {
          return this.selection.map(tupple => tupple.obj).includes(o)
      }
    }

    handle_left_click_selection(mouse_event, shift_key){

        if(!shift_key){
            //Reset colors and clear selection
            if(this.selection.length){
                let removed = this.selection.splice(0, this.selection.length);
                removed.forEach(tupple => {
                    let {obj, original_color} = tupple;
                    if(obj && obj.material.emissive){
                        obj.material.emissive.setHex(original_color);
                    }
                });    
            }
        }

        if(this.pickedObject && !this.InSelection(this.pickedObject)){
            //append picked object to selection and stash color
            this.selection.push({"obj": this.pickedObject, "original_color" : this.pickedObjectSavedColor});
            if(this.pickedObject.material.emissive){
                this.pickedObject.material.emissive.setHex(SELECTION_COLOR);
            }
            //TODO we need to flush a selection change to the model in the layout
        }
    }
    pick(normalizedPosition, scene, camera) {
      // restore the color if there is a picked object
      if (this.pickedObject) {
        if(this.pickedObject !== undefined){
            if(!this.InSelection(this.pickedObject)){
                if(this.pickedObject.material.emissive){
                    this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
                }
            }
        }
        this.pickedObject = undefined;
      }

      // cast a ray through the frustum
      this.raycaster.setFromCamera(normalizedPosition, camera);
      // get the list of objects the ray intersected
      //collect all the children of the group (scan) objects and intersect them

      const collectGroupChilds = (o => {
          let xs = [];
          if(o.children){
                // push children objects onto xs
                xs.push(... o.children.filter(c => c.type !== "Group"));
                // Recurse onto Group child objects
                xs.push(... o.children.filter(c => c.type === "Group").flatMap(collectGroupChilds));
          }
          return xs;
      });

      //AxesHelper cannot be highlighted
      const intersectedObjects = this.raycaster.intersectObjects(collectGroupChilds(scene).filter(obj => obj.constructor.name !== "AxesHelper"));

      if (intersectedObjects.length) {
        // pick the first object. It's the closest one
        this.pickedObject = intersectedObjects[0].object;
        // save its color
        if(this.pickedObject.material.emissive){
            this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
            // set its emissive color to flashing red/yellow    
        }
        
        if(!this.InSelection(this.pickedObject)){
            if(this.pickedObject.material.emissive){
                this.pickedObject.material.emissive.setHex(PICKING_COLOR);
            }

        }
        
      }else{
        this.pickedObject = undefined;
      }
    }
    getCanvasRelativePosition(e, render_domElement) {
        const rect = render_domElement.getBoundingClientRect();
        return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        };
    }
    
    setPickPosition(e, render_domElement) {
        const pos = this.getCanvasRelativePosition(e, render_domElement);
        this.pickPosition.x = (pos.x / render_domElement.clientWidth ) *  2 - 1;
        this.pickPosition.y = (pos.y / render_domElement.clientHeight) * -2 + 1;  // note we flip Y
    }
    
    clearPickPosition() {
        // unlike the mouse which always has a position
        // if the user stops touching the screen we want
        // to stop picking. For now we just pick a value
        // unlikely to pick something
        this.pickPosition.x = -100000;
        this.pickPosition.y = -100000;
    }

    fireEvents(fire_event_to_component, camera, renderer){
        //Event names should be centralized between engine and layout.
        if(this.pickedObject !== this.lastFramePickObject){
            //Our mouse is on top of something new.
            //this.pickedObject could be undefined

            if(this.triggerHoverOffForLastEmitted){
                if(this.lastEmittedPickedObject){
                    fire_event_to_component("viewer_landmark_hover_off",
                        this.lastEmittedPickedObject.parent["name"] ,this.lastEmittedPickedObject.name);
                }
                
                this.triggerHoverOffForLastEmitted = false;
            }

            if(this.pickedObject){
                fire_event_to_component("viewer_landmark_hover_on",
                    this.pickedObject.parent["name"] ,this.pickedObject.name);

                this.lastEmittedPickedObject = this.pickedObject;
                this.triggerHoverOffForLastEmitted = true;
            }
        }
        
        this.lastFramePickObject = this.pickedObject;

        if(this.pickedObject){
            this.pickedObject.geometry.computeBoundingSphere();
            let mesh_center = this.pickedObject.geometry.boundingSphere.center.clone();

            this.pickedObject.updateMatrixWorld(true);
            mesh_center.applyMatrix4(this.pickedObject.matrixWorld);
            camera.updateMatrixWorld(true)
            let vector = mesh_center.project(camera);

            fire_event_to_component("viewer_landmark_highlighted_position", { 
                x: ((vector.x / 2) * renderer.domElement.width) + (renderer.domElement.width/2),
                y: (renderer.domElement.height/2) - ((vector.y / 2) * renderer.domElement.height) 
            });
        }
    }
  }
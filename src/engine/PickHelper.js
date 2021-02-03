import * as THREE from 'three';
import configuration from "./config";
var CONFIG = CONFIG || new configuration();

class PickHelper {
    constructor(store) {
      this.$store = store;
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = undefined;
      this.lastFramePickObject = undefined;
      this.cached_highlight_position = undefined;
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

    handle_click_selection(mouse_event, shift_key, right_click=false){

        let skip_adding = false;

        if(right_click && this.InSelection(this.pickedObject)){
            //do nothing
        }else{

            if(!shift_key){
                //Reset colors and clear selection
                if(this.selection.length){
                    let removed = this.selection.splice(0, this.selection.length);
                    removed.forEach(tupple => {
                        let {obj, original_color} = tupple;
                        if(obj && obj.material.emissive){
                            obj.material.emissive.setHex(original_color);
                            if(this.pickedObject === obj){
                                this.pickedObjectSavedColor = original_color;
                                skip_adding = true;
                            }
                        }
                    });    
                }
            }

            if(this.pickedObject && !skip_adding){
                if(!this.InSelection(this.pickedObject)){
                    //append picked object to selection and stash color
                    this.selection.push({"obj": this.pickedObject, "original_color" : this.pickedObjectSavedColor});
                    if(this.pickedObject.material.emissive){
                        this.pickedObject.material.emissive.setHex(CONFIG.SELECTION_COLOR);
                    }
                }else{
                    let ind = this.selection.map(tupple => tupple.obj).indexOf(this.pickedObject);
                    let {obj, original_color} = this.selection.splice(ind, 1)[0];
                    if(obj && obj.material.emissive){
                        obj.material.emissive.setHex(original_color);
                        this.pickedObjectSavedColor = original_color;
                    }
                }
            }               
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
      //Filtering for just meshes because the LineSegments top level scene child would conflict
      let candidate_objects = collectGroupChilds(scene).filter(obj => obj.type === "Mesh" || obj.type === "Line" || obj.type === "LineSegments" && obj.constructor.name !== "AxesHelper");
      
      const intersectedObjects = this.raycaster.intersectObjects(candidate_objects);

      if (intersectedObjects.length) {
        // pick the first object. It's the closest one
        this.pickedObject = intersectedObjects[0].object;

        //TODO TASK Line Highlighting.
        //Turns out we can highlight lines.

        //Maybe we can stage two passes of intersection. Filter the line/linesegment into their own group and do that first.
        if(this.pickedObject.type === "Line" || this.pickedObject.type === "LineSegments"){
            console.log("yolo");
        }
        // save its color
        if(this.pickedObject.material.emissive){
            this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
            // set its emissive color to flashing red/yellow    
        }
        
        if(!this.InSelection(this.pickedObject)){
            if(this.pickedObject.material.emissive){
                this.pickedObject.material.emissive.setHex(CONFIG.PICKING_COLOR);
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
                    this.$store.commit("landmarks/highlighted_landmark_hover_off", 
                        this.lastEmittedPickedObject.parent.__underlying_filehash ,this.lastEmittedPickedObject.name);
                }
                
                this.triggerHoverOffForLastEmitted = false;
            }

            if(this.pickedObject){
                this.$store.commit("landmarks/highlighted_landmark_hover_off",
                    this.pickedObject.parent.__underlying_filehash ,this.pickedObject.name);
                
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
 
            let highlight_position =  {
                x: ((vector.x / 2) * renderer.domElement.width) + (renderer.domElement.width/2),
                y: (renderer.domElement.height/2) - ((vector.y / 2) * renderer.domElement.height) 
            };

            if(highlight_position !== this.cached_highlight_position){
                if(this.cached_highlight_position === undefined ||highlight_position !== this.cached_highlight_position){
                   this.$store.commit('landmarks/highlighted_set_position', highlight_position);
                }
                this.cached_highlight_position = highlight_position;
            }
        }
    }
  }

export default PickHelper;

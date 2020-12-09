/*

Heres the kind of json schema Im expecting to load with this thing
Overlay children are LoadTrees as well incase you want to nest a Last/Insole scan

        {
            name: "foot1 and sole",
            type: "FOOT",
            path: "./data/foot1.obj",
            overlay_children: [{
                    type: "INSOLE",
                    path: "./data/sole.obj",
                    config: {
                        position : {
                            x: 30,
                            y: 20,
                            z: -10
                        },
                        material_color : 0x00FF00,
                    }
            }],
        }
*/
const OBJ_TYPES = [
    "FOOT",
    "INSOLE",
    "LAST",
    "FOOT_PAIR"
]

const LOADING_STATES = {
    loaded : "LOADED",
    pending : "PENDING",
    awaiting : "AWAITING CHILDREN"
}

//Overlay children is for scans you want to 'overlay' on top of a parent scan.
//For example overlaying a last model over a foot model to visualize the difference.
//This is why this class is a LoadTree as you might want to overlay multiple lasts and toggle visibility on them.
//Handling that recursively, in the event someone wants to nest a bunch (partial scans etc idk), simplifies that.

//The response object is the ThreeJS object loaded by whichever loader (OBJLoader or STLLoader)
//Config applies Three.js operations to the ThreeJS object before first render.
module.exports = class LoadTree{
    constructor(name, path, type, overlay_children = undefined, config = undefined, parent=undefined, response_object=undefined){
        this.name = name;
        this.path = path;
        //Scan type TODO REFACTOR THIS NAME
        this.type = type;

        // this.file_ext = 
        //TODO regex on path to determine loader to use

        if(overlay_children){
            this.overlay_children = overlay_children;//These are also load trees
            this.overlay_children.forEach(c => {
                c.parent = this;
            });
        }
        
        if(config){
            this.config = config;
        }
        
        if(parent){
            this.parent = parent;
        }

        if(response_object){
            //This is the internal THREE.JS Object class for the loaded model
            this.response_object = response_object;
        }
        //response_object is also a field that probably needs to be hidden and exposed through an interface. Not sure yet
    }

    //WISHLIST refactor This needs to be decoupled from the current loader
    //TODO refactor the load state handling into seperate predicate and state transition functions
    //Make sure the strings this stringly typed shit points to a const array of them like the scan types.
    startLoadOBJS(obj_loader){
        this.load_state = "PENDING";

        obj_loader.load(this.path, function(response_text_obj_pair){
            response_text_obj_pair["MODEL_TYPE"] = this.type;
            response_text_obj_pair.obj["name"] = this.name;
            this.response_object = response_text_obj_pair;
            
            if(this.overlay_children){
                this.load_state = "AWAITING CHILDREN";
                //Recurse onto children
                this.overlay_children.forEach(child_load_graph => child_load_graph.startLoadOBJS(obj_loader));
            }else{
                this.load_state = "LOADED";
            }
        }.bind(this));
    }

    __pendingChildren(){
        if(this.overlay_children){
            return this.overlay_children.some(g => g.load_state === "PENDING")
        }else{
            return false;
        }
    }
    updateBasedOnAwaitingChildren(){
        if(this.load_state === "AWAITING CHILDREN"){
            if(this.__pendingChildren() === false){
                this.load_state = "LOADED";
            }else{
                //Recurse onto children
                this.overlay_children.forEach(child => child.updateBasedOnAwaitingChildren());
            }
        }
    }

    //Book keeping functions for setuping up internal THREEJS after loading is complete
    stitchSceneGraph(){
        if(this.overlay_children){
            this.overlay_children.forEach(child => {
                this.response_object.obj.add(child.response_object.obj);
                //Recurse onto children
                child.stitchSceneGraph();
            })
        }
    }

    //Utility predicate for the loading phase
    notLoaded(){
        return this.load_state !== "LOADED"
    }
    
    //Apply config and force overlay children to recursively apply config.
    applyConfig(){
        if(this.config){
            //iterate and pattern match on properties
            Object.entries(this.config).forEach(entry => {
                let key = entry[0];
                let value = entry[1];
                let obj = this.response_object.obj;

                console.log("Applying key and value "+ key + " "+ value);
                
                if(key === "position"){
                    let {x,y,z} = value;
                    obj.position.set(x,y,z);
                }else if(key === "material_color"){
                    //This 0 index might be too hard coded
                    obj.children[0].material.emissive.setHex(value);
                }else if(key === "rotation"){
                    let {x,y,z} = value;
                    obj.rotation.set(x,y,z);
                }else{
                    console.log("undefined setting pattern match " + key + " " + value);
                }
            })
        }
        if(this.overlay_children){
            this.overlay_children.forEach(child => child.applyConfig());
        }
    }

    //Builds a simple model for the Viewer Layout Vue Component of the load graph.
    //We might be able to convert this class into a scene graph manager and use the GraphRepresentationModel to aid with
    //scene graph tree traversals when we want to edit the scene from the Vue layer.
    buildTreeRepresentationModel(){
        return {
            "name" : this.name,
            "type" : this.type,

            //Optional based on existence in the graph
            ...this.response_object && {
                //Deep copy uuid?
                scene_uuid: this.response_object.obj.uuid,
                //Engine managed variables with data change events

                visibility: this.response_object.obj.visible ? this.response_object.obj.visible : 
                        (this.response_object.obj.children && this.response_object.obj.children[0] ? this.response_object.obj.children[0].visible : undefined)
                //This is a disgusting ternary that could be replaced with a lambda.
                //A Group with a foot mesh and landmarks will not have its own visible field so we need to use the foot mesh's instead.   
            },
            ...this.overlay_children && {
                overlay_children : this.overlay_children.map(c => c.buildTreeRepresentationModel())
            }
        };
        
    }

    //Pre order Tree Traversal for uuid
    //Can return empty list representing no uuid in tree
    //This list interface is awkward because of the children case potentially returning the uuid
    //across multiple children due to the lack of ownership semantics/invariants.
    traverseForUUID(target_uuid){
        if(this.response_object.obj.uuid === target_uuid){
            return [this];
        }else{
            if(this.overlay_children){
                return this.overlay_children.flatMap(g => g.traverseForUUID(target_uuid))
            }else{
                return [];
            }
        }
    }

    traverseAndApplyRecursively(f){
        f(this);
        if(this.overlay_children){
            this.overlay_children.forEach(c => c.traverseAndApplyRecursively(f));
        }
    }
    getTHREEObj(){
        return this.response_object.obj;
    }
    removeChild(tree){
        if(this.overlay_children.includes(tree)){
            tree.parent = null;
            this.overlay_children.splice(this.overlay_children.indexOf(tree),1);
            //Recursively remove from tree?
            if(this.overlay_children.length === 0){
                this.overlay_children = undefined;
            }
        }
    }
}
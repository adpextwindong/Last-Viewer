import * as THREE from 'three';
import OBJLoader from "../../../lib/vendor/three_loader_custom";
import STLLoader from "../../../lib/vendor/STLLoader";

import Tree from "../../types/Tree";

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
const OBJ_TYPES = Object.freeze({
    foot: Symbol("FOOT"),
    insole: Symbol("INSOLE"),
    last: Symbol("LAST"),
    foot_pair: Symbol("FOOT_PAIR")
});

const LOADING_STATES = Object.freeze({
    loaded : Symbol("LOADED"),
    pending : Symbol("PENDING"),
    awaiting : Symbol("AWAITING CHILDREN")
});

const FILE_REGEXPS = {
    wavefront_obj : /\w+(\.obj)$/i,
    stl : /\w+(\.stl)$/i
};

//This should be a result monad honestly
const PARSABLE_FILETYPES = {
    obj : "OBJ",
    stl : "STL",
    INVALID : "INVALID",
};

const parse_file_type = (name, path) => {
    if(FILE_REGEXPS.wavefront_obj.test(path) || FILE_REGEXPS.wavefront_obj.test(name)){
        return PARSABLE_FILETYPES.obj;
    }

    if(FILE_REGEXPS.stl.test(path) || FILE_REGEXPS.stl.test(name)){
        return PARSABLE_FILETYPES.stl;
    }

    //Failure case to catch unusable filetypes
    return PARSABLE_FILETYPES.INVALID;
};

//Overlay children is for scans you want to 'overlay' on top of a parent scan.
//For example overlaying a last model over a foot model to visualize the difference.
//This is why this class is a LoadTree as you might want to overlay multiple lasts and toggle visibility on them.
//Handling that recursively, in the event someone wants to nest a bunch (partial scans etc idk), simplifies that.

//The response object is the ThreeJS object loaded by whichever loader (OBJLoader or STLLoader)
//Config applies Three.js operations to the ThreeJS object before first render.
class LoadTree extends Tree {
    constructor(name, path, type, overlay_children = undefined, config = undefined, parent=undefined, response_object=undefined){
        super(overlay_children, parent);
        this.name = name;
        this.path = path;
        //Scan type TODO REFACTOR THIS NAME
        this.type = type;
        //TODO remove this
        console.log(type + OBJ_TYPES);

        //TODO REFACTOR Dimensions should be moved to the file manager metadata layer
        this.dimensions = undefined; //Used by scene graph hiearchy to store the dimensions on parse

        this.file_ext = parse_file_type(name, path);
        //TODO error log on invalid filetype

        if(config){
            this.config = config;
        }

        //TODO REFACTOR response object should be moved to the file manager.
        if(response_object){
            //This is the internal THREE.JS Object class for the loaded model
            this.response_object = response_object;
        }
        //response_object is also a field that probably needs to be hidden and exposed through an interface. Not sure yet
    }

    //TODO REFACTOR move this and the scan_selector loading code into the File Manager layer
    //TODO refactor This needs to be decoupled from the current loader
    //TODO refactor the load state handling into seperate predicate and state transition functions
    //Make sure the strings this stringly typed shit points to a const array of them like the scan types.
    startLoad(){
        this.load_state = LOADING_STATES.pending;

        //TODO CRITICAL SECTION FOR STL PATCH
        //We could just dispatch to the correct loader here and use the this.file_ext for control flow inside the onLoadHandler
        //TODO play with the STLLoader.js load function to see what it spits back

        //TODO test the behavior of the stl loader to see if we can reuse this closure
        //if reusable we can just dynamic dispatch on a this.loader that is set on class constructor

        //NOTE this only provides an onLoad function currently
        const handleLoadingStateBasedOnChildren = () => {
            if(this.overlay_children){
                this.load_state = LOADING_STATES.awaiting;
                //Recurse onto children
                this.overlay_children.forEach(child_load_graph => child_load_graph.startLoad());
            }else{
                this.load_state = LOADING_STATES.loaded;
            }
        }

        if(this.file_ext === PARSABLE_FILETYPES.obj){
            let objloader = new OBJLoader();

            objloader.load(this.path, function(response_text_obj_pair){
                //This spits back a text of the file and a THREEJS group object

                response_text_obj_pair["MODEL_TYPE"] = this.type;
                response_text_obj_pair.obj["name"] = this.name;
                this.response_object = response_text_obj_pair;

                handleLoadingStateBasedOnChildren();
            }.bind(this));

        }else if(this.file_ext === PARSABLE_FILETYPES.stl){
            var loader = new STLLoader.STLLoader();

            loader.load(this.path,function(result){
                console.log("STL!!!");
                console.log(result);

                //TODO find a better mesh basic material
                const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
                const model = new THREE.Mesh(result, material);
                const group = new THREE.Group();
                group.add(model);

                //Make sure this conforms to the ResourceManager constructor
                //We probably need handling on non existent landmark names because of the texts
                this.response_object = {
                    obj : group
                };

                handleLoadingStateBasedOnChildren();
            }.bind(this));
            //TODO put in the stl handler
        }else{
            console.error("Unparsable filetype");
        }

    }

    __pendingChildren(){
        //Uses base Tree class someChildren
        return this.someChildren((g) => g.load_state === LOADING_STATES.pending);
    }
    __OLD_XXX_pendingChildren(){
        //Wrap the some check to prevent NPE/undefined deref
        if(this.overlay_children){
            return this.overlay_children.some(g => g.load_state === LOADING_STATES.pending)
        }else{
            return false;
        }
    }
    updateBasedOnAwaitingChildren(){
        if(this.load_state === LOADING_STATES.awaiting){
            if(this.__pendingChildren() === false){
                this.load_state = LOADING_STATES.loaded;
            }else{
                //Recurse onto children
                this.overlay_children.forEach(child => child.updateBasedOnAwaitingChildren());
            }
        }
    }

    //TODO consider moving this into the scene manager
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
        return this.load_state !== LOADING_STATES.loaded;
    }

    //TODO REFACTOR remove this and move it to the scene graph manager layer
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
            "dimensions" : this.dimensions,

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

    //TODO REFACTOR SCENE GRAPH
    //This should be traverse for
    //With a partially applied method for uuid

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

    //TODO REFACTOR SCENE GRAPH
    //This is too tightly tied between the response object and threejs scene
    getTHREEObj(){
        return this.response_object.obj;
    }
}

export default LoadTree;

//This SceneGraph tree type is to decouple file loading from the THREE.scene managment.
//Files get loaded into the file manager and are cached there.
//This lets us manipulate the scene independent of how the loadTree was handled in the first place.
//This way we can append to the tree later on in the runtime.

import Tree from "../../types/tree";
import configuration from "../config";
var CONFIG = CONFIG || new configuration();

class SceneGraph extends Tree {
    constructor(file_manager_ref, loadTree, scene_parent=undefined){
        super(
            loadTree.overlay_children ? loadTree.overlay_children.map(child => new SceneGraph(file_manager_ref, child)) : undefined,
            scene_parent);
        this.__underlying_filehash = loadTree.hash();

        //TODO figure out why cloning a THREE object with the clone function directly doesn't work.
        this.obj = file_manager_ref.getCachedDirect(this.__underlying_filehash);
        this.scene_parent = scene_parent;

        //Metadata
        this.metadata = {
            name : loadTree.name,
            type : loadTree.type, //Scan Type
            file_ext : loadTree.file_ext,

            //This might need to go to the FileManager layer for caching
            dimensions : undefined,
            landmarks : undefined, //This needs to map to the File Manager landmark
            //This should be copy on write if anything needs to happen
        }
        if(loadTree.config){
            this.config = JSON.parse(JSON.stringify(loadTree.config)); //Deep clone so we can edit the Scene Object's config for saving
        }

        this.__stitchSceneGraph();
        this.__applyConfig();
    }

    hash(){
        return this.path;
    }

    //Book keeping functions for setuping up internal THREEJS after loading is complete
    __stitchSceneGraph(){
        if(this.overlay_children){
            this.overlay_children.forEach(child => {
                this.obj.add(child.obj);
                //Recurse onto children
                child.__stitchSceneGraph();
            })
        }
    }

    __applyConfig(recurse=true){
        if(this.config){
            //iterate and pattern match on properties
            Object.entries(this.config).forEach(entry => {
                let key = entry[0];
                let value = entry[1];
    
                console.log("Applying key and value "+ key + " "+ value);
    
                if(key === "position"){
                    let {x,y,z} = value;
                    this.obj.position.set(x,y,z);
                }else if(key === "material_color"){
                    //This 0 index might be too hard coded
                    this.obj.children[0].material.emissive.setHex(value);
                }else if(key === "rotation"){
                    let {x,y,z} = value;
                    this.obj.rotation.set(x,y,z);
                }else{
                    console.log("undefined setting pattern match " + key + " " + value);
                }
            })
        }
        if(recurse && this.overlay_children){
            this.overlay_children.forEach(child => child.__applyConfig(recurse));
        }
    }

//Builds a simple model for the Viewer Layout Vue Component of the load graph.
    buildTreeRepresentationModel(){
        return {
            "name" : this.metadata.name,
            "type" : this.metadata.type,
            "dimensions" : this.metadata.dimensions,
            
            "scene_uuid": this.obj.uuid,
            "visibility": this.obj.visible ? this.obj.visible :
                    (this.obj.children && this.obj.children[0] ? this.obj.children[0].visible : undefined),
            //This is a disgusting ternary that could be replaced with a lambda.
            //A Group with a foot mesh and landmarks will not have its own visible field so we need to use the foot mesh's instead.

            ...this.overlay_children && {
                overlay_children : this.overlay_children.map(c => c.buildTreeRepresentationModel())
            }
        };
    
    }

    //TODO REFACTOR SCENE GRAPH
    //This should be traverse for
    //With a partially applied method for uuid

    //Tree Traversal for uuid
    //Can return empty list representing no uuid in tree
    //This list interface is awkward because of the children case potentially returning the uuid
    //across multiple children due to the lack of ownership semantics/invariants.
    traverseForUUID(target_uuid){
        if(this.obj.uuid === target_uuid){
            return [this];
        }else{
            if(this.overlay_children){
                return this.overlay_children.flatMap(g => g.traverseForUUID(target_uuid))
            }else{
                return [];
            }
        }
    }
}

export default SceneGraph;
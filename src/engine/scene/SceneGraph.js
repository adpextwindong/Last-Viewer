//NOT A WORKING CLASS YET, JUST OLD CODE FROM THE LoadTree before we split out the scene manager related stuff.
//Lets centralize details about the scene graph representation stuff here.

//As of Tue, Jan 26, 2021  commit 7659857, the file loading is too tangled up
//We use a 
import Tree from "../../types/Tree";
import configuration from "../config";
var CONFIG = CONFIG || new configuration();

class SceneGraph extends Tree {
    constructor(loadTree, obj, scene_parent=undefined){
        super(
            loadTree.overlay_children ? loadTree.overlay_children.map(child => new SceneGraph(child)) : undefined,
            scene_parent);

        this.obj = obj;
        this.scene_parent = scene_parent;

        this.__underlying_filehash = loadTree.hash();

        //Metadata
        this.metadata = {
            name : loadTree.name,
            type : loadTree.type, //Scan Type
            file_ext : loadTree.file_ext,

            //This might need to go to the FileManager layer for caching
            dimensions : undefined,
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
                child.stitchSceneGraph();
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
            this.overlay_children.forEach(child => child.applyConfig(recurse));
        }
    }

    
//Until now this was the scene_repr model
//The load tree handled it when it was touching THREEjs scene objects
//When the scene_manager should be doing that or something.

//Builds a simple model for the Viewer Layout Vue Component of the load graph.
//We might be able to convert this class into a scene graph manager and use the GraphRepresentationModel to aid with
//scene graph tree traversals when we want to edit the scene from the Vue layer.

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
}

export default SceneGraph;
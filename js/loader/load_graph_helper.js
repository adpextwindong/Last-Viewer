/*

Heres the kind of json schema Im expecting to load with this thing
Overlay children are LoadGraphs as well incase you want to nest a Last/Insole scan

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

//This might have to be renamed to LoadTree
module.exports = class LoadGraph{
    constructor(name, path, type, overlay_children = undefined, config = undefined, parent=undefined){
        this.name = name;
        this.path = path;
        this.type = type;

        if(overlay_children){
            this.overlay_children = overlay_children;//These are also load graphs
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
        //response_object is also a field that probably needs to be hidden and exposed through an interface. Not sure yet
    }

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
    applyConfig(){
        if(this.config){
            //iterate and pattern match on properties
            Object.entries(this.config).forEach(entry => {
                let key = entry[0];
                let value = entry[1];
                let obj = this.response_object.obj;

                console.log("Applying key and value "+ key + " "+ value);
                //TODO this should be done in a more safer manner with checks to prevent throwing exceptions on bad configs
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
    buildGraphRepresentationModel(){
        return {
            "name" : this.name,
            "type" : this.type,

            //Optional based on existence in the graph
            ...this.response_object && {
                //Deep copy uuid?
                scene_uuid: this.response_object.obj.uuid
            },
            ...this.overlay_children && {
                overlay_children : this.overlay_children.map(c => c.buildGraphRepresentationModel())
            }
        };
        
    }

    //Pre order Tree Traversal for uuid or something too????
    //Can return empty list representing no uuid in tree
    //TODO testing on a deep tree would help
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

    getTHREEObj(){
        return this.response_object.obj;
    }
    removeChild(graph){
        if(this.overlay_children.includes(graph)){
            graph.parent = null;
            this.overlay_children.splice(this.overlay_children.indexOf(graph),1);
            //Recursively remove from tree?
            if(this.overlay_children.length === 0){
                this.overlay_children = undefined;
            }
        }
    }
}
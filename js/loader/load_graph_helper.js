/*

Heres the kind of json schema Im expecting to load with this thing
Overlay children are LoadGraphs as well incase you want to nest a Last/Insole scan

existing_load_schemes: [
            [{
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
            }]
        ],
*/
const OBJ_TYPES = [
    "FOOT",
    "INSOLE",
    "LAST",
    "FOOT_PAIR"
]

module.exports = class LoadGraph{
    constructor(name, path, type, overlay_children = [], config={}){
        this.name = name;
        this.path = path;
        this.type = type;

        this.overlay_children = overlay_children;//These are also load graphs
        this.config = config;
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
            //This could be rewritten as a class predicate
            if(this.__pendingChildren() === false){
                this.load_state = "LOADED";
            }else{
                //Recurse onto children
                this.overlay_children.forEach(child => child.updateBasedOnAwaitingChildren());
            }
        }
    }

    stitchSceneGraph(){
        if(this.overlay_children){
            this.overlay_children.forEach(child => {
                this.response_object.obj.add(child.response_object.obj);
                //Recurse onto children
                child.stitchSceneGraph();
            })
        }
    }
}
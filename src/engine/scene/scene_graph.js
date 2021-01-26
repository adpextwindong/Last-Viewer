//NOT A WORKING CLASS YET, JUST OLD CODE FROM THE LoadTree before we split out the scene manager related stuff.
//Lets centralize details about the scene graph representation stuff here.

//As of Tue, Jan 26, 2021  commit 7659857, the file loading is too tangled up
//We use a 

//TODO porting
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


const applyConfig = function(){
    if(this.config){
        //iterate and pattern match on properties
        Object.entries(this.config).forEach(entry => {
            let key = entry[0];
            let value = entry[1];
            
            //This needs to be refactored for scene_graph migration
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
}

applyConfigRecursively(){
    //Applies to self and recurses onto children and applies their configs to them as well
    this.traverseAndApplyRecursively(applyConfig);
}


//Until now this was the scene_repr model
//The load tree handled it when it was touching THREEjs scene objects
//When the scene_manager should be doing that or something.

//Builds a simple model for the Viewer Layout Vue Component of the load graph.
//We might be able to convert this class into a scene graph manager and use the GraphRepresentationModel to aid with
//scene graph tree traversals when we want to edit the scene from the Vue layer.
// buildTreeRepresentationModel(){
//     return {
//         "name" : this.name,
//         "type" : this.type,
//         "dimensions" : this.dimensions,

//         //Optional based on existence in the graph
//         ...this.response_object && {
//             //Deep copy uuid?
//             scene_uuid: this.response_object.obj.uuid,
//             //Engine managed variables with data change events

//             visibility: this.response_object.obj.visible ? this.response_object.obj.visible :
//                     (this.response_object.obj.children && this.response_object.obj.children[0] ? this.response_object.obj.children[0].visible : undefined)
//             //This is a disgusting ternary that could be replaced with a lambda.
//             //A Group with a foot mesh and landmarks will not have its own visible field so we need to use the foot mesh's instead.
//         },
//         ...this.overlay_children && {
//             overlay_children : this.overlay_children.map(c => c.buildTreeRepresentationModel())
//         }
//     };

// }
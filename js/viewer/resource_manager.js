//All the resource ownership/managment of objs and
//interactions via UUIDS should be done through this class.

const CONFIG = require("../config");

class ResourceManager {
    constructor(scene, processed_loadTreeList){
        this.scene_ref = scene;
        this.__processed_loadTreeList = processed_loadTreeList;
        this.flush_flag = false;


        //This handles the raw loadTree
        //Processed LoadTree shouldn't be touched otherwise except for stashing parsed obj's
        //for later use if they're removed from the scene.
        //Additionally response object should never be touched by the engine directly
        this.objs = this.__processed_loadTreeList.map(t => t.response_object.obj);

        //This will be the dictionary for looking up objects by UUID.
        //If anything gets removed from the scene its entry here should be removed.
        this.scene_uuids = {};
        this.scene_landmark_by_uuids = {};
        //indexed by parent uuid then landmark index
        this.scene_landmarks = {};

        let manager_scope = this;
        const bind_engine_watchers = function(obj) {
            Object.defineProperty(obj, 'visible', {
                set: function(v){
                    manager_scope.flush_flag = true;
                }
            })
        }

        this.objs.forEach(o => {
            this.scene_ref.add( o );

            this.scene_uuids[o.uuid] = o;
            bind_engine_watchers(o);
        });

        
        let allMeshs = this.objs.flatMap(o => o.children);
        allMeshs.filter(o => !o.name.includes("landmark")).forEach(o => {
            this.scene_uuids[o.uuid] = o;
            o.layers.set(CONFIG.LAYERS_SCANS);
        });

        let allLandmarkMeshes = allMeshs.filter(o => o.name.includes("landmark"));
        allLandmarkMeshes.forEach(o => o.layers.set(CONFIG.LAYERS_LANDMARKS));

        allLandmarkMeshes.forEach(mesh => {
            let landmark_index = mesh.name.split("landmark_")[1];

            if(this.scene_landmarks[mesh.parent.uuid] === undefined){
                this.scene_landmarks[mesh.parent.uuid] = {};
            }

            this.scene_landmarks[mesh.parent.uuid][landmark_index] = mesh;
            this.scene_landmark_by_uuids[mesh.uuid] = mesh;
        });

        if(processed_loadTreeList.every(g => g.config === undefined)){
            console.log("defaulting positions and rotations")
            this.__setDefaultOrientations();
        }


        
    }

    __setDefaultOrientations(){
        let max_mesh_width = Math.max.apply(Math, this.objs.map(o =>{
            o.children[0].geometry.computeBoundingBox();
            return o.children[0].geometry.boundingBox.getSize();
        }).map(v => v.x));

        //Position the foot objs across the X axis in a distributed manner.

        for(let i = 0; i < this.objs.length; i++){
            this.objs[i].position.set(((-max_mesh_width*this.objs.length)/2) + i*max_mesh_width, -50, -50);
            
            this.objs[i].rotation.set(CONFIG.DEFAULT_ROTATION_X,
                CONFIG.DEFAULT_ROTATION_Y,
                CONFIG.DEFAULT_ROTATION_Z);
        }
    }

    getBySceneUUID(uuid){
        //Returns a reference to the managed UUID that is in the scene
        return this.scene_uuids[uuid];
    }

    mapOverTopObjs(f){
        this.objs.map(f);
    }
    forEachTopObjs(f){
        this.objs.forEach(f);
    }

    __isTopLevelObj(uuid){
        return this.objs.map(o => o.uuid).indexOf(uuid) !== -1;
    }

    toggleVisibility(uuid){
        let o = this.scene_uuids[uuid];

        const toggleSelfAndFirstChild = obj => {
            if(obj.visible !== undefined){
                obj.visible = !obj.visible;
            }
            if(obj.type === "Group"){
                //TODO BUGFIX This line triggers the axes helper to be visible after a toggle for some reason.
                obj.children[0].visible = !obj.children[0].visible;
                console.log("Toggling visibilty of ");
                console.log(obj.children[0]);
            }
        };

        toggleSelfAndFirstChild(o);

        this.flush_flag = true;
    }


    addDimensionData(uuid, feet_dimensions){
        //TODO process the parsed dimensions for measurement meshes
        // we can generate and add to the mesh group

        // At first we should try the Pternion to "Foot length point Pternion-CP axis" lm0 lm27 axis along the bottom of the foot

        let {left, right} = feet_dimensions;
        
        //TODO make a search scene for uuid function
        //TODO RESOURCE REFACTOR 3/4/20
        let mesh = this.scene_uuids[uuid];

        console.log("right here");

        //Returns the coordinates of the landmark's tip
        const getLandmarkPoint = (mesh) =>{
            let float_32_array = mesh.geometry.attributes.position.array;

            //18 faces get laid out in an array with the last 3 refering to the 5th point, the tip.
            // f 1// 3// 2//
            // f 1// 4// 3//
            // f 1// 5// 4//
            // f 1// 2// 5//
            // f 2// 3// 4//
            // f 2// 4// 5//

            let ind = 17*3;
            return [float_32_array[0], float_32_array[1], float_32_array[2]];
        };

        //TODO refactor scene landmarks to be indexed by uuid then lm#
        if("0" in this.scene_landmarks[mesh.uuid] && "27" in this.scene_landmarks[mesh.uuid]){
            let pt_mesh = this.scene_landmarks[mesh.uuid]["0"];
            let foot_length_cp_mesh = this.scene_landmarks[mesh.uuid]["27"];

            let points = [];
            points.push(new THREE.Vector3(...getLandmarkPoint(pt_mesh)));
            points.push(new THREE.Vector3(...getLandmarkPoint(foot_length_cp_mesh)));
            
            //TODO The pt mesh point needs to be projected down onto the same Y axis plane as the flcp point

            let material = new THREE.LineBasicMaterial({
                color: 0xffa500
            });
            let geometry = new THREE.BufferGeometry().setFromPoints(points);
            let line = new THREE.Line(geometry, material);

            //TODO add a lines layer
            line.layers.set(CONFIG.LAYERS_LANDMARKS);

            //TODO RESOURCE REFACTOR 3/4/20
            mesh.add(line);


            this.scene_uuids[line.uuid] = line;

        }
    }

    removeUUID(uuid){

        //Remove from scene and assoc tables
        if(uuid in this.scene_landmark_by_uuids){
            //Its a landmark
            let parent_uuid = this.scene_landmark_by_uuids[uuid].parent.uuid;
            
            delete this.scene_landmarks[parent_uuid][uuid];
            delete this.scene_landmark_by_uuids[uuid];
            
        }else if(this.__isTopLevelObj(uuid)){
            let removed = this.objs.splice(this.objs.map(o => o.uuid).indexOf(uuid) ,1);
            this.scene_ref.remove(removed[0]);

            delete this.scene_uuids[uuid];
        }

        //Remove from loadTreeList
        let xs = this.__processed_loadTreeList.flatMap(g => g.traverseForUUID(uuid));
        xs.forEach(o => {
            this.scene_ref.remove(o.getTHREEObj());
            if(o.parent){
                o.parent.getTHREEObj().remove(o.getTHREEObj());
                o.parent.removeChild(o);
            }else{
                //Apparently its the top of the tree or something
                this.__processed_loadTreeList.splice(this.__processed_loadTreeList.indexOf(o), 1);
            }
        })

        //TODO add caching for later reuse.
        this.flush_flag = true;
    }
}

module.exports = ResourceManager;
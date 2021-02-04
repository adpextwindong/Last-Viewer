//All the resource ownership/managment of objs and
//interactions via UUIDS should be done through this class.

import SceneGraph from './SceneGraph';

import ENGINE_EVENTS from "../engine_events";
import configuration from "../config";
var CONFIG = CONFIG || new configuration();

import { genLandmarkFeatures } from "./landmark_utils";

//TODO refactor parts of this class so its more readable and consistent in naming
//Centralizing the uuid LUTS and related functions will be nice for future work
class SceneManager {
    constructor(scene, component_event_emitter_ref, rerender_ref, store_ref){
        this.scene_ref = scene;
        this.component_event_emitter_ref = component_event_emitter_ref;
        this.rerender_ref = rerender_ref;
        this.store_ref = store_ref;
        
        this.scene_graph_trees = []; //[SceneGraph]

        this.scene_uuids = new Map(); // Map<uuid, three_obj>
        this.scene_landmark_by_uuids = new Map(); //Map<Landmark Mesh UUID, Mesh Object>

        //indexed by parent uuid then landmark index
        //Map<uuid, [landmark_index]>
        this.scene_landmarks = new Map();
    }
    // processLoadedTree :: LOADED LoadTree -> SceneGraph
    processLoadedTree(file_manager_ref, loadTree, scene_parent=undefined){
        // let root_object = file_manager_ref.cloneCachedHash(loadTree.hash(), true);
        let root_object = file_manager_ref.getFileCachedDirect(loadTree.hash());

        let scene_graph = new SceneGraph(file_manager_ref, loadTree, scene_parent);
        //TODO push new SceneLandmarks to Vuex store
        this.store_ref.commit("landmarks/addLandmarks", scene_graph);
        //Needs to be handled in the uuid remover too

        if(scene_parent === undefined && loadTree.parent === undefined){
            console.log("Pushing new top level tree");
            this.scene_graph_trees.push(scene_graph);
        }

        let manager_scope = this;
        const bind_engine_watchers = function(obj) {
            Object.defineProperty(obj, 'visible', {
                set: function(){
                    manager_scope.component_event_emitter_ref(ENGINE_EVENTS.scene_graph_change);
                }
            })
        }

        //Add root object to scene and bind engine watchers.
        if(scene_parent === undefined){
            this.scene_ref.add( root_object );
        }else{
            scene_parent.add(root_object);
        }

        //Register object UUID to scene manager
        this.scene_uuids.set(root_object.uuid, root_object);
        bind_engine_watchers(root_object);


        let allMeshs = root_object.children;

        //Filter for nonLandmarks and Camera Layer them as scans
        //Register nonlandmark UUIDS
        allMeshs.filter(o => !o.name.includes("landmark")).forEach(o => {
            this.scene_uuids.set(o.uuid, o);
            o.layers.set(CONFIG.LAYERS_SCANS);
        });

        //Find all landmark meshes 
        let allLandmarkMeshes = allMeshs.filter(o => o.name.includes("landmark"));
        allLandmarkMeshes.forEach(o => o.layers.set(CONFIG.LAYERS_LANDMARKS));

        //Register landmarks by landmark_INDEX as per in the file and by their uuid
        allLandmarkMeshes.forEach(mesh => {
            let landmark_index = mesh.name.split("landmark_")[1];

            if(this.scene_landmarks.get(mesh.parent.uuid) === undefined){
                this.scene_landmarks.set(mesh.parent.uuid, {});
            }

            this.scene_landmarks.get(mesh.parent.uuid)[landmark_index] = mesh;
            this.scene_landmark_by_uuids.set(mesh.uuid, mesh);


        });

        let features = genLandmarkFeatures(root_object, this.scene_landmarks);
        root_object.add(...features);
        //Register landmark feature UUIDS in scene uuid registry
        features.forEach(ft => {
            this.scene_uuids[ft.uuid] = ft;
        });

        //this.__addMeasurementDataMeshes(root_object.uuid);
        //     //TASK ENGINE WORK Fix the defaulter so it correctly orrientates the model
        //     //A simple heuristic that for the general length vs width should work.
        //     //Figuring out heel end might be a bit rougher.
        // }
    }

    buildSceneGraphModels(){
        //ENGINE_EVENTS.scene_graph_change;
        return this.scene_graph_trees.map(t => t.buildTreeRepresentationModel());
    }

    __get_max_mesh_width(){
        return Math.max.apply(Math, this.scene_graph_trees.map(g =>{
            g.obj.children[0].geometry.computeBoundingBox();
            return g.obj.children[0].geometry.boundingBox.getSize();
        }).map(v => v.x));
    }
    __setDefaultPositions(){
        let max_mesh_width = this.__get_max_mesh_width();

        for(let i = 0; i < this.scene_graph_trees.length; i++){
            this.scene_graph_trees[i].obj.position.set(((-max_mesh_width*this.scene_graph_trees.length)/2) + i*max_mesh_width, -50, -50);
        }
    }
    __setDefaultOrientations(){
        //Position the foot objs across the X axis in a distributed manner.
        for(let i = 0; i < this.scene_graph_trees.length; i++){
            //TASK Implement correct orrientation


            this.scene_graph_trees[i].obj.rotation.set(CONFIG.DEFAULT_ROTATION_X,
                CONFIG.DEFAULT_ROTATION_Y,
                CONFIG.DEFAULT_ROTATION_Z);
        }
    }

    getBySceneUUID(uuid){
        //Returns a reference to the managed UUID that is in the scene
        return this.scene_uuids.get(uuid);
    }

    mapOverTopObjs(f){
        this.scene_graph_trees.map(f);
    }
    
    __isTopLevelObj(uuid){
        return this.scene_graph_trees.map(o => o.uuid).indexOf(uuid) !== -1;
    }

    toggleVisibility(uuid){
        let o = this.scene_uuids[uuid];

        const toggleSelfAndFirstChild = obj => {
            if(obj.visible !== undefined){
                obj.visible = !obj.visible;
            }
            if(obj.type === "Group"){
                obj.children[0].visible = !obj.children[0].visible;
                console.log("Toggling visibilty of ");
                console.log(obj.children[0]);
            }
        };

        toggleSelfAndFirstChild(o);

        this.flush_flag = true;
        this.component_event_emitter_ref(ENGINE_EVENTS.scene_graph_change);
    }

    addFootDimensionData(uuid, feet_dimensions){
        //Find loadtree of uuid and append dimension data
        //REFACTOR SCENE GRAPH
        this.getBySceneUUID(uuid).loadtree.dimensions = feet_dimensions;
        //caller should update the scene graph representation
    }
    //TODO yeah fix this
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
        let xs = this.scene_graph_trees.flatMap(g => g.traverseForUUID(uuid));
        xs.forEach(o => {
            this.scene_ref.remove(o.obj);
            if(o.parent){
                o.parent.obj.remove(o.obj);
                o.parent.removeChild(o);
            }else{
                //Apparently its the top of the tree or something
                this.scene_graph_trees.splice(this.scene_graph_trees.indexOf(o), 1);
            }
        })
        this.component_event_emitter_ref(ENGINE_EVENTS.scene_graph_change);
        this.rerender_ref("FORCE", "Scene Manager Remove UUID");
    }
}

export default SceneManager;

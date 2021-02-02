//All the resource ownership/managment of objs and
//interactions via UUIDS should be done through this class.

import * as THREE from "three";
import SceneGraph from './SceneGraph';

import ENGINE_EVENTS from "../engine_events";
import configuration from "../config";
var CONFIG = CONFIG || new configuration();

function getValueOfLowestVert(mesh, axis){
    let verts = mesh.geometry.attributes.position.array;
    let axis_mod = axis === 'X' ? 0: (axis === 'Y' ? 1: 2);

    let filtered_verts  = verts.filter((v, ind) => (ind % 3) === axis_mod);
    let min = Math.min(filtered_verts);
    return verts[verts.indexOf(min)];
}

//Returns the coordinates of the landmark's tip
function getLandmarkPoint(landmark_mesh){
    let float_32_array = landmark_mesh.geometry.attributes.position.array;

    return [float_32_array[0], float_32_array[1], float_32_array[2]];
}

//TODO refactor parts of this class so its more readable and consistent in naming
//Centralizing the uuid LUTS and related functions will be nice for future work
class SceneManager {
    // processLoadedTree :: LOADED LoadTree -> SceneGraph
    processLoadedTree(file_manager_ref, loadTree, scene_parent=undefined){
        // let root_object = file_manager_ref.cloneCachedHash(loadTree.hash(), true);
        let root_object = file_manager_ref.getCachedDirect(loadTree.hash());

        let scene_graph = new SceneGraph(file_manager_ref, loadTree, scene_parent);

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

        this.__addMeasurementDataMeshes(root_object.uuid);
        //     //TASK ENGINE WORK Fix the defaulter so it correctly orrientates the model
        //     //A simple heuristic that for the general length vs width should work.
        //     //Figuring out heel end might be a bit rougher.
        // }
    }

    buildSceneGraphModels(){
        //ENGINE_EVENTS.scene_graph_change;
        return this.scene_graph_trees.map(t => t.buildTreeRepresentationModel());
    }

    constructor(scene, component_event_emitter_ref, rerender_ref){
        this.scene_ref = scene;
        this.scene_graph_trees = []; //[SceneGraph]
        this.component_event_emitter_ref = component_event_emitter_ref;
        this.rerender_ref = rerender_ref;
        //TODO REFACTOR SCENE_GRAPH Redo this stuff w/ Javascript Map
        //Because WeakMap doesn't allow for enumeration we probably can't use that unless
        //iterating over a list of keys into the WeakMap
        this.scene_uuids = new Map(); // Map<uuid, three_obj>
        this.scene_landmark_by_uuids = new Map();

        //indexed by parent uuid then landmark index
        this.scene_landmarks = new Map();
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

    __LineBetweenLandmarks(mesh, lm_number_a, lm_number_b, project_down_onto_axis = undefined){
        let landmark_a = this.scene_landmarks[mesh.uuid][lm_number_a];
        let landmark_b = this.scene_landmarks[mesh.uuid][lm_number_b];

        let points = [];
        points.push(new THREE.Vector3(...getLandmarkPoint(landmark_a)));
        points.push(new THREE.Vector3(...getLandmarkPoint(landmark_b)));

        //WISHLIST See if projecting down is all we need
        if(project_down_onto_axis !== undefined &&
            (project_down_onto_axis === "X" || project_down_onto_axis === "Y" || project_down_onto_axis === "Z")){

            if(project_down_onto_axis === "X"){
                let val = getValueOfLowestVert(mesh.children[0], "X");
                points[0].setX(val);
                points[1].setX(val);
            }else if(project_down_onto_axis === "Y"){
                let val = getValueOfLowestVert(mesh.children[0], "Y");
                points[0].setY(val);
                points[1].setY(val);
            }else {
                let val = getValueOfLowestVert(mesh.children[0], "Z");
                points[0].setZ(val);
                points[1].setZ(val);
            }
        }

        let material = new THREE.LineBasicMaterial({
            //TODO Make this a constant
            color: 0xffa500,
            linewidth : 4
        });
        let geometry = new THREE.BufferGeometry().setFromPoints(points);
        let line = new THREE.Line(geometry, material);

        line.layers.set(CONFIG.LAYERS_LANDMARKS);

        //WISHLIST LINE PICKING/HOVERING now make the line be pickable/hoverable
        //figure out how to make the lines fat for CPU picking...
        //Otherwise GPU picking will be necessary.

        return line;
    }

    __addLineToMeshAndRegister(mesh, landmark_a, landmark_b, project_down_onto_axis = undefined){
        //Returns the created line reference for future editing by the handler. Things like mesh material etc.
        let line = this.__LineBetweenLandmarks(mesh, landmark_a, landmark_b, project_down_onto_axis);
        mesh.add(line);
        this.scene_uuids[line.uuid] = line;

        return line;
    }

    __addBallGirthCircumference_Line(mesh){
        //
        //Ball Girth Circumference using Highest Point Ball Girth, Most Medial Point Ball Girth, Most Lateral Point Ball Girth landmarks.
        //
        let highest_point_ball_girth = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid]["25"]));
        let most_medial_point_ball_girth = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid]["28"]));
        let most_lateral_point_ball_girth = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid]["29"]));

        this.__addCircumferenceLineFromCutPlane(mesh, highest_point_ball_girth, most_medial_point_ball_girth, most_lateral_point_ball_girth);
    }

    //TODO fix these circumference interactions with the model (or parent model) being rotated.
    __addHeelGirthCircumference(mesh){
        // LM44 LM1 (interpolate 3rd point for plane from colinear points) Heel Girth Circumference
        const midPointBetweenTwoPoints = (point_a, point_b) => {
            let v_ab = new THREE.Vector3(
                point_b.x - point_a.x,
                point_b.y - point_a.y,
                point_b.z - point_a.z
            );
            v_ab.multiplyScalar(0.5);

            return new THREE.Vector3(
                point_a.x + v_ab.x,
                point_a.y + v_ab.y,
                point_a.z + v_ab.z);
        }

        let pternion_point = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid][1]));
        let junction_point = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid][44]));
        let coplanar_point = midPointBetweenTwoPoints(pternion_point, junction_point);
        //Arbitrary distance away from the center line axis of the foot to get a coplanar point (instead of having a point along the pt junction axis)
        coplanar_point.setY(coplanar_point.y + 50);

        this.__addCircumferenceLineFromCutPlane(mesh, pternion_point, junction_point, coplanar_point);
    }

    __addCircumferenceLineFromCutPlane(mesh, point_a, point_b, point_c){
        //https://stackoverflow.com/questions/42348495/three-js-find-all-points-where-a-mesh-intersects-a-plane
        //https://jsfiddle.net/8uxw667m/4/

        //Creates a plane from the three landmarks and intersects mesh geometry faces with the plane to find the circumference points.
        //Intersected points are put into a geometry object and a LineSegments

        let p_a = new THREE.Vector3().copy(point_a),
            p_b = new THREE.Vector3().copy(point_b),
            p_c = new THREE.Vector3().copy(point_c);

        mesh.updateMatrixWorld(true);
        p_a = p_a.applyMatrix4(mesh.matrixWorld);
        p_b = p_b.applyMatrix4(mesh.matrixWorld);
        p_c = p_c.applyMatrix4(mesh.matrixWorld);

        let intersection_plane = new THREE.Plane();

        intersection_plane.setFromCoplanarPoints(p_a, p_b, p_c);

        if(mesh instanceof THREE.Group){
            let obj = mesh.children[0];

            var a = new THREE.Vector3(),
                b = new THREE.Vector3(),
                c = new THREE.Vector3();

            var lineAB = new THREE.Line3(),
                lineBC = new THREE.Line3(),
                lineCA = new THREE.Line3();

            var pointsOfIntersection = [];

            var pointOfIntersection = new THREE.Vector3();
            let setPointOfIntersection = function(line, plane){
                let tempVec = new THREE.Vector3();
                pointOfIntersection = plane.intersectLine(line,tempVec);
                if(pointOfIntersection){
                    pointsOfIntersection.push(tempVec.clone());
                }
            };
            let geometry = (new THREE.Geometry()).fromBufferGeometry(obj.geometry);
            geometry.faces.forEach(function(face){
                obj.localToWorld(a.copy(geometry.vertices[face.a]));
                obj.localToWorld(b.copy(geometry.vertices[face.b]));
                obj.localToWorld(c.copy(geometry.vertices[face.c]));

                lineAB = new THREE.Line3(a, b);
                lineBC = new THREE.Line3(b, c);
                lineCA = new THREE.Line3(c, a);

                setPointOfIntersection(lineAB, intersection_plane);
                setPointOfIntersection(lineBC, intersection_plane);
                setPointOfIntersection(lineCA, intersection_plane);
            });

            /*
            var pointsMaterial = new THREE.PointsMaterial({
                size: .5,
                color: "blue"
            }); */


            // var points = new THREE.Points(pointsOfIntersection, pointsMaterial);
            var lineMaterial = new THREE.LineBasicMaterial( { color: 0x9932CC } );
            var buffGem = new THREE.BufferGeometry().setFromPoints(pointsOfIntersection);
            var line = new THREE.LineSegments( buffGem, lineMaterial );

            line.layers.enable(CONFIG.LAYERS_MEASUREMENT_LINES);
            // console.log("Adding lines layer, hope it works");
            mesh.add( line );
        }
    }

    __addMeasurementDataMeshes(uuid){
        let mesh = this.scene_uuids.get(uuid);


        if(mesh.uuid in this.scene_landmarks){

            //TODO unhardcode these and use a Object.freeze({symbols}) scheme for storing these numbers
            const landmarkNumbersInScene = (landmark_number, ...args) => {
                return landmark_number in this.scene_landmarks[mesh.uuid] && (args.length ? landmarkNumbersInScene(...args) : true);
            }

            if(landmarkNumbersInScene(0, 27)){
                //0 Pternion
                //27
                console.log("Adding foot length pternion cp axis line");
                this.__addLineToMeshAndRegister(mesh, 0, 27, "Z");
            }

            if(landmarkNumbersInScene(25, 28, 29)){
                console.log("Adding ball girth circumference line");
                this.__addBallGirthCircumference_Line(mesh);
            }

            if(landmarkNumbersInScene(20,21)){
                console.log("Adding heel breadth line");
                this.__addLineToMeshAndRegister(mesh, 20, 21, "Z");
            }

            if(landmarkNumbersInScene(20,28)){
                console.log("Adding MT & Medial Heelbreadth Toe Angle Base Line");
                this.__addLineToMeshAndRegister(mesh, 20, 28);
            }

            if(landmarkNumbersInScene(21,29)){
                console.log("Adding MT & Lateral Heelbreadth Toe Angle Base Line");
                this.__addLineToMeshAndRegister(mesh, 21, 29);
            }

            if(landmarkNumbersInScene(1,44)){
                console.log("Adding Heel Girth circumference line");
                this.__addHeelGirthCircumference(mesh);
            }
            //WISHLIST consider adding functionality to extend past to a certain distance for stuff like Toe Angle Base Lines
        }
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

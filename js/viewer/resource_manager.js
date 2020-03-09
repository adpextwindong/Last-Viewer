//All the resource ownership/managment of objs and
//interactions via UUIDS should be done through this class.

const CONFIG = require("../config");

function getValueOfLowestVert(mesh, axis){
    let verts = mesh.geometry.attributes.position.array;
    let axis_mod = axis === 'X' ? 0: (axis === 'Y' ? 1: 2);

    let filtered_verts  = verts.filter((v, ind) => (ind % 3) === axis_mod);
    let min = Math.min(...filtered_verts);
    return verts[verts.indexOf(min)];
}

//Returns the coordinates of the landmark's tip
function getLandmarkPoint(landmark_mesh){
    let float_32_array = landmark_mesh.geometry.attributes.position.array;

    return [float_32_array[0], float_32_array[1], float_32_array[2]];
};


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
            //TODO add a layer to toggle visibility of line measurements
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

        this.objs.forEach(o => {
            this.addMeasurementDataMeshes(o.uuid);
        });
        //TODO 3/5/20 Theres a bug with the plane code in addDimension and rotations. Not sure whats up yet

        //Probably should just debug print out the mesh and the planehelper or something, the 3 coplanar points or something.

        if(processed_loadTreeList.every(g => g.config === undefined)){
            // Distributed Positions
            console.log("defaulting positions");
            this.__setDefaultPositions();
            // Rotations
            console.log("defaulting rotations");
            this.__setDefaultOrientations();

        }


        
    }
    __get_max_mesh_width(){
        return Math.max.apply(Math, this.objs.map(o =>{
            o.children[0].geometry.computeBoundingBox();
            return o.children[0].geometry.boundingBox.getSize();
        }).map(v => v.x));
    }
    __setDefaultPositions(){
        let max_mesh_width = this.__get_max_mesh_width();

        for(let i = 0; i < this.objs.length; i++){
            this.objs[i].position.set(((-max_mesh_width*this.objs.length)/2) + i*max_mesh_width, -50, -50);         
        }
    }
    __setDefaultOrientations(){
        //Position the foot objs across the X axis in a distributed manner.
        for(let i = 0; i < this.objs.length; i++){          
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

    addFootDimensionData(uuid, feet_dimensions){
        let {left, right} = feet_dimensions;
        //TODO add UI divs for feet dimensions on hover, etc.
    }
    addMeasurementDataMeshes(uuid){
        //TODO process the parsed dimensions for measurement meshes
        // we can generate and add to the mesh group
        
        let mesh = this.scene_uuids[uuid];

        //Foot Length procedure using Pternion and Foot Length point Pternion-CP axis landmarks
        if(mesh.uuid in this.scene_landmarks){

            if("0" in this.scene_landmarks[mesh.uuid] && "27" in this.scene_landmarks[mesh.uuid]){
                let pt_mesh = this.scene_landmarks[mesh.uuid]["0"];
                let foot_length_cp_mesh = this.scene_landmarks[mesh.uuid]["27"];

                let points = [];
                points.push(new THREE.Vector3(...getLandmarkPoint(pt_mesh)));
                points.push(new THREE.Vector3(...getLandmarkPoint(foot_length_cp_mesh)));
                
                //Project PT point onto same Z plane as flcp point
                let val = getValueOfLowestVert(mesh.children[0], "Z");
                points[0].setZ(val);
                points[1].setZ(val);
                
                //TODO now make the line be pickable/hoverable

                let material = new THREE.LineBasicMaterial({
                    color: 0xffa500
                });
                let geometry = new THREE.BufferGeometry().setFromPoints(points);
                let line = new THREE.Line(geometry, material);

                //TODO add a lines layer
                line.layers.set(CONFIG.LAYERS_LANDMARKS);
                
                mesh.add(line);

                this.scene_uuids[line.uuid] = line;
            }

            //https://stackoverflow.com/questions/42348495/three-js-find-all-points-where-a-mesh-intersects-a-plane
            //https://jsfiddle.net/8uxw667m/4/

            //
            //Ball Girth Circumference using Highest Point Ball Girth, Most Medial Point Ball Girth, Most Lateral Point Ball Girth landmarks.
            // 
            //Creates a plane from the three landmarks and intersects mesh geometry faces with the plane to find the circumference points.
            //Intersected points are put into a geometry object and a LineSegments 
            if("25" in this.scene_landmarks[mesh.uuid] &&
                    "28" in this.scene_landmarks[mesh.uuid] &&
                    "29" in this.scene_landmarks[mesh.uuid]){

                mesh.updateMatrixWorld(true);

                let highest_point_ball_girth = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid]["25"]));
                let most_medial_point_ball_girth = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid]["28"]));
                let most_lateral_point_ball_girth = new THREE.Vector3(...getLandmarkPoint(this.scene_landmarks[mesh.uuid]["29"]));

                mesh.updateMatrixWorld(true);
                highest_point_ball_girth = highest_point_ball_girth.applyMatrix4(mesh.matrixWorld);
                most_medial_point_ball_girth = most_medial_point_ball_girth.applyMatrix4(mesh.matrixWorld);
                most_lateral_point_ball_girth = most_lateral_point_ball_girth.applyMatrix4(mesh.matrixWorld);
            
                let intersection_plane = new THREE.Plane();
                
                intersection_plane.setFromCoplanarPoints(highest_point_ball_girth, 
                                                            most_medial_point_ball_girth,
                                                            most_lateral_point_ball_girth);

                // let plane_helper = new THREE.PlaneHelper(intersection_plane, 1000, 0xffc0cb);
                // this.scene_ref.add(plane_helper);
                
                if(mesh instanceof THREE.Group){
                    let obj = mesh.children[0];

                    var a = new THREE.Vector3(),
                        b = new THREE.Vector3(),
                        c = new THREE.Vector3();

                    var lineAB = new THREE.Line3(),
                        lineBC = new THREE.Line3(),
                        lineCA = new THREE.Line3();

                    var pointsOfIntersection = new THREE.Geometry();
                    var pointOfIntersection = new THREE.Vector3();

                    let setPointOfIntersection = function(line, plane){
                        let tempVec = new THREE.Vector3();
                        pointOfIntersection = plane.intersectLine(line,tempVec);
                        if(pointOfIntersection){
                            pointsOfIntersection.vertices.push(tempVec.clone());
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

                    var pointsMaterial = new THREE.PointsMaterial({
                        size: .5,
                        color: "blue"
                    });

                    var points = new THREE.Points(pointsOfIntersection, pointsMaterial);
                    
                    // 0x9932CC
                    // 0xffa500
                    console.log("REEE");
                    console.log(pointsOfIntersection);
                    var lineMaterial = new THREE.LineBasicMaterial( { color: 0x9932CC } );
                    var line = new THREE.LineSegments( pointsOfIntersection, lineMaterial );
                    
                    mesh.add( line );
                    // this.scene_ref.add( line );
                }
                
            }
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
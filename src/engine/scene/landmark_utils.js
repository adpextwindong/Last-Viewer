import configuration from "../config";
var CONFIG = CONFIG || new configuration();

//As defined in http://dl.iwl.jp/pdf_files/infoot_measurement_point_and_items_e.pdf
const LANDMARK_LUT = Object.freeze({
    "0" : "Pternion", "Pternion": "0",
    //TODO finish this lookup table
    "25" : "Highest Point Ball Girth", "Highest Point Ball Girth" : "25",
    "27" : "Foot length point Pternion-CP axis", "Foot length point Pternion-CP axis" : "27",
 });

const FEATURE_TYPE = Object.freeze({
    "Line" : Symbol("Line"),
    "Circumference" : Symbol("Circumference"),

});

/*
{
    name : "",
    type : FEATURE_TYPE,
    args : [],
    f : (mesh, scene_landmarks, name, type) => {

        let feature_mesh;

    }
}
*/

//genLandmarkFeatures handles applying these custom functions
//This is to provide flexibility incase I need to do extra math like extending lines past landmarks
const FOOT_FEATURES = Object.freeze([
    {
        name : "Foot Length Pternion CP Axis Line",
        type : FEATURE_TYPE.Line,
        args : [0,27,"Z"],
        f : (mesh, mesh_landmarks, name, type) => {
            let pternion = mesh_landmarks[0];
            //CP is Center point located in width of Ball Girth Cross section which passes through MT&MF
            let center_point_foot_length = mesh_landmarks[27];

            let feature_mesh = LineBetweenLandmarks(mesh, pternion, center_point_foot_length, "Z");
            
            feature_mesh.name = name;
            feature_mesh.feature_type = type;
            return feature_mesh;
        }
    },
    {
        name : "Ball Girth Circumference Line",
        type : FEATURE_TYPE.Circumference,
        args : [25, 28, 29],
        f : (mesh, mesh_landmarks, name, type) => {
            let highest_point_ball_girth = new THREE.Vector3(...extractLandmarkPoint(mesh_landmarks[25]));
            let most_medial_point_ball_girth = new THREE.Vector3(...extractLandmarkPoint(mesh_landmarks[28]));
            let most_lateral_point_ball_girth = new THREE.Vector3(...extractLandmarkPoint(mesh_landmarks[29]));

            let feature_mesh = CircumferenceLineFromCutPlane(mesh,  highest_point_ball_girth,
                                                                    most_medial_point_ball_girth,
                                                                    most_lateral_point_ball_girth);
            feature_mesh.name = name;
            feature_mesh.feature_type = type;
            return feature_mesh;
        }
    }
]);

/*
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

*/


function landmarkNumbersInScene(mesh_landmarks, landmark_number, ...args){
    return landmark_number in mesh_landmarks &&
                (args.length ? landmarkNumbersInScene(mesh_landmarks, ...args) : true);
}

function avalible_features(mesh_landmarks){
    return FOOT_FEATURES.filter(feature => {
        let landmark_indexes = feature.args.filter(arg => typeof arg === "number");
        return landmarkNumbersInScene(mesh_landmarks, ...landmark_indexes);
    });
}

//This function should be pure
//Handler needs to make sure the feature uuids get registered
//SceneLandmarks Map<UUID, [Landmarks]>
function genLandmarkFeatures(mesh, scene_landmarks){
    //WISHLIST consider adding functionality to extend past to a certain distance for stuff like Toe Angle Base Lines

    if(mesh.uuid in scene_landmarks){
        let mesh_landmarks = scene_landmarks[mesh.uuid];
        let candidate_features = avalible_features(mesh_landmarks);

        let generated_features = candidate_features.map(feature => {
            return feature.f(mesh, mesh_landmarks, feature.name, feature.type);
        });

        return generated_features;
    }else{
        return [];
    }
}



///
/// Helpers
///
function getValueOfLowestVert(mesh, axis){
    let verts = mesh.geometry.attributes.position.array;
    let axis_mod = axis === 'X' ? 0: (axis === 'Y' ? 1: 2);

    let filtered_verts  = verts.filter((v, ind) => (ind % 3) === axis_mod);
    let min = Math.min(filtered_verts);
    return verts[verts.indexOf(min)];
}

function extractLandmarkPoint(landmark_mesh){
    let float_32_array = landmark_mesh.geometry.attributes.position.array;

    return [float_32_array[0], float_32_array[1], float_32_array[2]];
}

///
/// FEATURE PRIMITIVES
///

//Project Down Onto Axis takes an "X","Y","Z" axis and projects the points down to the lowest value vertice of the mesh in that axis
//This allows us to put lines on the bottom of the foot surface so they aren't inside the foot mesh.
function LineBetweenLandmarks(mesh, landmark_a, landmark_b, project_down_onto_axis = undefined){
    // let landmark_a = this.scene_landmarks[mesh.uuid][lm_number_a];
    // let landmark_b = this.scene_landmarks[mesh.uuid][lm_number_b];

    let points = [];
    points.push(new THREE.Vector3(...extractLandmarkPoint(landmark_a)));
    points.push(new THREE.Vector3(...extractLandmarkPoint(landmark_b)));

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

    line.layers.set(CONFIG.LAYERS_MEASUREMENT_LINES);

    //WISHLIST LINE PICKING/HOVERING now make the line be pickable/hoverable
    //figure out how to make the lines fat for CPU picking...
    //Otherwise GPU picking will be necessary.

    return line;
}


function CircumferenceLineFromCutPlane(mesh, point_a, point_b, point_c){
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
        return line;
    }else{
        console.error("Haven't hit this case for a circumference");
    }
}

export default genLandmarkFeatures;
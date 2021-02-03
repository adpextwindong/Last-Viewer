import Vue from "vue";
import { Landmark } from '../../parser/landmark_parser';

import APP_SETTINGS from "../../app_settings";

//The file manager is the source of truth for scene objects
//This vuex state is a model for VueJS views
//The scene manager should handle updating this

//This class extends Landmark to handle in scene details
class SceneLandmark extends Landmark{
    //Base landmark is defined, as parsed by, the landmark_parser.js
    constructor(base_landmark, ){
        super(base_landmark.description, base_landmark.group_name);

        //Used for VueJS level UI handling
        this.isActive = false;
    }
}

const state = {
    landmarks : {}, //This should be treated as a {FileHash: [SceneLandmark]}
    //NOTE: Vuejs 2 doesn't support Map because of reactivity issues

    //TODO Probably needs a parent uuid
    highlighted_landmark : {
        position : { 
            x: -1000,
            y: -1000
        },
        name : ""
    },

    landmark_list_visible : true
};

const getters = {

};

function addLandmarksForSceneObject(state, scene_graph, recurse=true){
    if(scene_graph.metadata.has.landmarks){
        let scene_landmarks = scene_graph.metadata.landmarks.map(base_landmark => new SceneLandmark(base_landmark));
        let hash = scene_graph.__underlying_filehash;

        Vue.set(state.landmarks, hash, scene_landmarks);
    }

    if(recurse && scene_graph.overlay_children){
        scene_graph.overlay_children.forEach(child_scene_graph => {
            addLandmarksForSceneObject(state, child_scene_graph, recurse);
        });
    }
}

//TODO This is brittle to adding new landmarks in the engine as its just a list.

//Applies f given it exists and has an index in landmarks[parent_hash]
const applyIfExistingLandmark = (landmarks) => (parent_hash, viewer_group_name, f) => {
    if(landmarks[parent_hash]){
        let ind = landmarks[parent_hash].findIndex(element => element.group_name === viewer_group_name);
        if(ind !== -1){
            f(ind);
        }
    }
};

//This module handles pushing state changes (like the scene picker highlight changes) into the VueJS related components
const mutations = {
    addLandmarks(state, scene_graph){
        addLandmarksForSceneObject(state, scene_graph, true); //Adds landmarks recursively to landmarks dict
    },

    removeLandmarks(state, hash){
        Vue.set(state.landmarks, hash, undefined);
        //TODO test this. It should only be used by the scene manager
        //We might need to remove that hash property on the landmarks object
    },
    ///
    //Used by engine/PickHelper.js
    ///
    highlighted_landmark_hover_on(state, parent_hash, viewer_group_name){
        applyIfExistingLandmark(state.landmarks, parent_hash, viewer_group_name, (ind) =>{
            state.landmarks[parent_hash][ind].isActive = true;
            let group_name = APP_SETTINGS.APP_DEBUG ? viewer_group_name : "";

            Vue.set(state.highlighted_landmark, 'name', group_name + " " + Vue.t(state.landmarks[parent_hash][ind].description));
        });
    },

    highlighted_landmark_hover_off(state, parent_hash, viewer_group_name){
        applyIfExistingLandmark(state.landmarks, parent_hash, viewer_group_name, (ind) =>{
            state.landmarks[parent_hash][ind].isActive = false;
            Vue.set(state.highlighted_landmark, 'name', "");
        });
    },

    highlighted_set_position(state, position_v2){
        Vue.set(state.highlighted_landmark, 'position', position_v2);
    },
    ///
    ///

    toggle_landmark_list(state){
        Vue.set(state,'landmark_list_visible',!state.landmark_list_visible);
    }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
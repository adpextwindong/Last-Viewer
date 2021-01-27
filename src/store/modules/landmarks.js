import Vue from "vue";
import LandmarkParser from '../../parser/landmark_parser';

import APP_SETTINGS from "../../app_settings";

const state = {
    //Indexed by obj.name of top level scan objects
    landmarks : {},

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

//TODO consider pushing this landmark loading into a LOADER class so the landmarks text file handling is inline w/ OBJ loading
function initLandmarks(state, processed_loadTreeList){
    //TODO make this more robust for when the model doesnt have landmarks
    let initLandmarkTexts = (parent_obj_name, text) => {
        Vue.set(state.landmarks, parent_obj_name, []);
        state.landmarks[parent_obj_name].push(...LandmarkParser.parseLandmarkTextToList(text));
    };

    let addLandmarks = tree_node => {
        let {text, obj} = tree_node.response_object;
        initLandmarkTexts(obj["name"],text);
        
        if(tree_node.overlay_children){
            tree_node.overlay_children.forEach(child => {
                addLandmarks(child);
            })
        }
    }
    processed_loadTreeList.forEach(t => addLandmarks(t));
}

//Applies f given it exists and has an index in landmarks[parent_key]
const applyIfExistingLandmark = (landmarks) => (parent_key, viewer_group_name, f) => {
    if(landmarks[parent_key]){
        let ind = landmarks[parent_key].findIndex(element => element.group_name === viewer_group_name);
        if(ind !== -1){
            f(ind);
        }
    }
};

//This module handles pushing state changes (like the scene picker highlight changes) into the VueJS related components
const mutations = {
    initializeLandmarks(state, processed_loadTreeList){
        initLandmarks(state, processed_loadTreeList);
    },

    highlighted_landmark_hover_on(state, parent_key, viewer_group_name){
        applyIfExistingLandmark(state.landmarks, parent_key, viewer_group_name, (ind) =>{
            state.landmarks[parent_key][ind].isActive = true;
            let group_name = APP_SETTINGS.APP_DEBUG ? viewer_group_name : "";

            Vue.set(state.highlighted_landmark, 'name', group_name + " " + Vue.t(state.landmarks[parent_key][ind].description));
        });
    },

    highlighted_landmark_hover_off(state, parent_key, viewer_group_name){
        applyIfExistingLandmark(state.landmarks, parent_key, viewer_group_name, (ind) =>{
            state.landmarks[parent_key][ind].isActive = false;
            Vue.set(state.highlighted_landmark, 'name', "");
        });
    },

    highlighted_set_position(state, position_v2){
        Vue.set(state.highlighted_landmark, 'position', position_v2);
    },
    highlighted_set_name(state, name){
        Vue.set(state.highlighted_landmark, 'name', name);
    },

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
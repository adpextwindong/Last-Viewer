const state = {
    landmarks : [],

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

const mutations = {
    highlighted_landmark_hover_on(state, parent_key, viewer_group_name){
        //TODO
    },

    highlighted_landmark_hover_off(state, parent_key, viewer_group_name){
        //TODO
    },

    highlighted_set_position(state, position_v2){
        Vue.set(state.highlighted_landmark, 'position', position_v2);
    },
    highlighted_set_name(state, name){
        Vue.set(state.highlighted_landmark, 'name', name);
    }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations
}
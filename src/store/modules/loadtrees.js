import Vue from "vue";

const state = {
    trees : undefined,
};

const getters = {
    trees: state => {
        return state.trees;
    }
};

//NOTE THIS IS USED FOR THE VIEWER_LAYOUT BOOT PROCESS, MANAGEMENT IS DONE BY SCENE_MANAGER
//THIS SHOULD ONLY BE USED IN THE MOUNTED() LIFECYCLE METHOD OF VIEWER LAYOUT
const mutations = {
    setTrees(state, trees){
        Vue.set(state, 'trees', trees);
    }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations
}

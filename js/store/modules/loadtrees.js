const state = {
    trees : undefined,
};

const getters = {
    trees: state => {
        return state.trees;
    }
};

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
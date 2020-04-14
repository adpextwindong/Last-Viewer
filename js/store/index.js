import Vuex from 'vuex';

Vue.use(Vuex);

import landmarksModule from './modules/landmarks';
import loadTreesModule from './modules/loadtrees';

export default new Vuex.Store({
  modules: {
    landmarks: landmarksModule,
    loadTrees: loadTreesModule
  },

})
import Vuex from 'vuex';

Vue.use(Vuex);

import landmarksModule from './modules/landmarks';

export default new Vuex.Store({
  modules: {
    landmarks: landmarksModule
  },

})
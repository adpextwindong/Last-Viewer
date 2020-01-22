import VueRouter from 'vue-router';
Vue.use(VueRouter);

import Scan_Selector from './components/scan_selector';
import Viewer from './components/viewer_layout';

//These imports could be moved down and asyncly done from viewer probably
Vue.component('vue-context', () => import('vue-context'));
Vue.component('landmark_list', () => import('./components/landmark_list'));
Vue.component('scene_graph_hiearchy', () => import('./components/scene_graph_hiearchy'));

//TODO we might need VueX at this rate this is really dirty
var initialLoadGraphs;
let setInitialLoadGraph = function(graphs) {
    initialLoadGraphs = graphs;
}
let getInitialLoadGraphs = function(graphs) {
    return initialLoadGraphs;
}

var app = new Vue({
    el: '#app',

    methods : {
        WebGLAvailible(){
            return window.WebGLRenderingContext !== undefined;
        },
    },
    router : new VueRouter({
        routes: [
            { path: '/', component: Scan_Selector, props: {loaderGraphsSetter : setInitialLoadGraph}},
            { path: '/engine', component: Viewer, props: {loadGraphsGetter : getInitialLoadGraphs}},
        ],
        base: __dirname,
    }),
});

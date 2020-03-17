import VueRouter from 'vue-router';
import VueTranslate from 'vue-translate-plugin';
Vue.use(VueRouter);
Vue.use(VueTranslate);


import Scan_Selector from './components/scan_selector';
import Settings_Menu from './components/settings_menu';
import Viewer from './components/viewer_layout';

//These imports could be moved down and asyncly done from viewer probably
Vue.component('vue-context', () => import('vue-context'));
Vue.component('landmark_list', () => import('./components/landmark_list'));
Vue.component('scene_graph_hiearchy', () => import('./components/scene_graph_hiearchy'));
Vue.component('view_controls', () => import('./components/view_controls.js'));

const CONFIG = require("./config");

//TODO REFACTOR VUEX (this is really dirty)
var initialLoadTrees;
let setInitialLoadTrees = function(trees) {
    initialLoadTrees = trees;
}
let getInitialLoadTrees = function(trees) {
    return initialLoadTrees;
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
            { path: '/', component: Scan_Selector, props: {loaderTreesSetter : setInitialLoadTrees}},
            { path: '/settings', component: Settings_Menu},
            { path: '/engine', component: Viewer, props: {loadTreesGetter : getInitialLoadTrees}},
        ],
        base: __dirname,
    }),
    created : function(){
        let locale = window.localStorage.getItem("locale");
        if(locale){
            this.$translate.setLang(locale);
        }else{
            this.$translate.setLang(CONFIG.DEFAULT_LOCALE);
        }
    },
});

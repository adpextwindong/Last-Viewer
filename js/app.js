import VueRouter from 'vue-router';
import VueTranslate from 'vue-translate-plugin';
import store from './store';

Vue.use(VueTranslate);


import Scan_Selector from './components/scan_selector';
import Settings_Menu from './components/settings_menu';
import Viewer from './components/viewer/viewer_layout';

//These imports could be moved down and asyncly done from viewer probably
Vue.component('vue-context', () => import('vue-context'));
Vue.component('landmark_list', () => import('./components/viewer/landmark_list'));
Vue.component('landmark_list_item', () => import('./components/viewer/landmark_list_item'));
Vue.component('scene_graph_hiearchy', () => import('./components/viewer/scene_graph_hiearchy'));
Vue.component('view_controls', () => import('./components/viewer/view_controls.js'));
Vue.component('landmark_nametag', () => import('./components/viewer/landmark_nametag'));
Vue.component('dimensions', () => import('./components/viewer/dimensions'));
const CONFIG = require("./config");

var app = new Vue({
    el: '#app',
    store, 
    methods : {
        WebGLAvailible(){
            return window.WebGLRenderingContext !== undefined;
        },
    },
    router : new VueRouter({
        routes: [
            { path: '/', component: Scan_Selector}, 
            { path: '/settings', component: Settings_Menu},
            { path: '/engine', component: Viewer},
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

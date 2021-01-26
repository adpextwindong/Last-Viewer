<template>
	<div id="app" v-cloak>
		<div v-if="WebGLAvailible()">
			<!-- Figure out how to hide this with a class or something during the engine page -->	
			<nav id="router_nav">
				<router-link to="/">Home</router-link>
				<router-link to="/settings">Settings Menu</router-link>
			</nav>
			<router-view></router-view>
		</div>
		<div class="webgl_warning" v-else>
			<span>Your browser does not seem to support WebGL. Please use a WebGL enabled device to use this viewer.</span>
		</div>
	</div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>

<script>
import Vue from "vue";
import VueRouter from 'vue-router';
import VueTranslate from 'vue-translate-plugin';
import store from './store';

Vue.use(VueTranslate);


import Scan_Selector from './views/scan_selector';
import Settings_Menu from './views/settings_menu';
import Viewer from './views/viewer_layout';

//These imports could be moved down and asyncly done from viewer probably
//TODO make the components used by viewer private to the viewer component
Vue.component('vue-context', () => import('vue-context'));
Vue.component('landmark_list', () => import('./components/viewer/landmark_list'));
Vue.component('landmark_list_item', () => import('./components/viewer/landmark_list_item'));
Vue.component('scene_graph_hiearchy', () => import('./components/viewer/scene_graph_hiearchy'));
Vue.component('view_controls', () => import('./components/viewer/view_controls.js'));
Vue.component('landmark_nametag', () => import('./components/viewer/landmark_nametag'));
Vue.component('dimensions', () => import('./components/viewer/dimensions'));

//TODO make this runtime configurable
import APP_SETTINGS from "./app_settings";

export default {
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
            this.$translate.setLang(APP_SETTINGS.DEFAULT_LOCALE);
        }
    },
};

</script>
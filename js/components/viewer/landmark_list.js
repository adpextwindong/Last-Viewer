import {mapState} from 'vuex';

export default {
    template : `
        <div v-if="visible === true">
            <landmark_list_item v-for="(landmark_group,key,index) in landmarks"
                v-bind:landmark_group="landmark_group"
                v-bind:key=index></landmark_list_item>
        </div>
   `,
    computed: {
        ...mapState('landmarks/', {
            landmarks: state => state.landmarks,
            visible: state => state.landmark_list_visible 
        })
    }
}
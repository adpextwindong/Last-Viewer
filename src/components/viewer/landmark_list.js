import {mapState} from 'vuex';

const renderLandmarkList = function(h, landmarks){
    let landmark_lists = [];
    for (let hash in landmarks){
        landmark_lists.push(
                h('landmark_list_item', {props: {landmark_group : landmarks[hash]}, key:hash})
        );
    }
    return landmark_lists;
}
export default {
//     template : `
//         <div v-if="visible === true">
//              for landmarks_hashes in state.landmark
//                   <landmark_list_item v-for="(landmark_group,key,index) in landmarks"
//                       v-bind:landmark_group="landmark_group"
//                       v-bind:key=index></landmark_list_item>
//         </div>
//    `,
    computed: {
        ...mapState('landmarks/', {
            landmarks: state => state.landmarks,
            test_visible: state => state.landmark_list_visible 
        })
    },
    watch:{
        landmarks(landmarks){
            // this.$set(this, 'landmarks', landmarks);
            console.log(landmarks);
            console.log("This should rerender");
            // this.render();
        }
    },
    render: function(h){
        if(this.test_visible){
            // console.error("Debug my ass");
            return h('section',
                { attrs:{id: "LandmarksList"} },
                renderLandmarkList(h, this.landmarks)
            );
        }
    }
}
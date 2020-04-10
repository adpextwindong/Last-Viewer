import {mapState} from 'vuex';

export default {
    template: `
        <div id="landmark_nametag_wrapper">
            <span id="landmark_nametag">{{ name }}</span>
        </div>`,
    //TODO figure out if theres an easier way to destructure this
    computed: {
        ...mapState('landmarks/', {
            name: state => state.highlighted_landmark.name,
            position: state => state.highlighted_landmark.position,
            visible: state =>  state.highlighted_landmark.visible
        })
    },
    watch:{
        position(newPosition){
            const leftOffset = 20;
            const topOffset = 20;

            //TODO cache this
            let target = this.$el.querySelector("span");
            target.style["left"] = (newPosition.x + leftOffset) + "px";
            target.style["top"] = (newPosition.y - topOffset) + "px";
        }
    },

    mounted(){
//TODO hide the element on mount
    }
}

//TODO port this to the watcher
// this.$on('viewer_landmark_highlighted_position', function(hightlighted_position_v2){
//     this.lm_nametag_el = document.querySelector("#landmark_nametag_wrapper span");
//     this.lm_nametag_el.style["left"] = (hightlighted_position_v2.x + 20) + "px";
//     this.lm_nametag_el.style["top"] = (hightlighted_position_v2.y - 20) + "px";
// });


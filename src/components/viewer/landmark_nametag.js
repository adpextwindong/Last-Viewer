import {mapState} from 'vuex';

//These fields in highlighted_landmark correspond to the Vuex Landmark store's highlighted_landmark structure

export default {
    template: `
        <div id="landmark_nametag_wrapper">
            <span id="landmark_nametag">{{ name }}</span>
        </div>`,
    computed: {
        ...mapState('landmarks/', {
            name: state => state.highlighted_landmark.name,
            position: state => state.highlighted_landmark.position,
        })
    },
    watch:{
        position(newPosition){
            const leftOffset = 20;
            const topOffset = 20;

            this.target_el.style["left"] = (newPosition.x + leftOffset) + "px";
            this.target_el.style["top"] = (newPosition.y - topOffset) + "px";
        }
    },

    mounted(){
        this.target_el = this.$el.querySelector("span");
    }
}

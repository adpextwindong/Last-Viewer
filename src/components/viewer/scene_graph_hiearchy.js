import DimensionParser from '../../parser/dimensions_parser';

//This module recursively builds a Scene graph representation of the 3d scene for debug purposes only.
module.exports = {
    locales : {
        en: {

        },
        jp: {
            'Toggle Visibility': '表示／非表示',
            'Remove from scene': '画面から削除'
        },
    },
    template : `
    <div>
        <div v-for="graph_repr in scene_graph_representation">
            <div @drop.prevent="xmlDataHandler($event, graph_repr.scene_uuid)" @dragover.prevent>
                <span>Name : {{ graph_repr.name }} </span>
                <span>Type : {{ graph_repr.type }} </span>
                <span>UUID : {{ graph_repr.scene_uuid }} </span>
                <span>Visibility : {{ graph_repr.visibility }} </span>
                <button type="button" v-on:click="engine_interface.toggleVisibilityUUID(graph_repr.scene_uuid)">{{t('Toggle Visibility')}}</button>
                <button type="button" v-on:click="engine_interface.emitRemoveUUIDRequest(graph_repr.scene_uuid)">{{t('Remove from scene')}}</button>

                <dimensions v-if="graph_repr.dimensions !== undefined"
                    v-bind:dimensions="graph_repr.dimensions"
                />
                <scene_graph_hiearchy v-if="graph_repr.overlay_children !== undefined"
                    v-bind:scene_graph_representation="graph_repr.overlay_children"
                    v-bind:engine_interface="engine_interface"
                    ></scene_graph_hiearchy>
                
            </div>
        </div>
    </div>
    `,
    props: ['scene_graph_representation', 'engine_interface'],
    name: 'scene_graph_hiearchy',
    methods : {

        //TODO handling should be moved elsewhere, its convient for debugging to do it drag&drop like this for now.
        //Handles parsing of an xml file for foot dimensions
        async xmlDataHandler(ev, scene_uuid){
            console.log('File(s) dropped');
          
            //TODO file validation and error handling

            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();

            if(ev.dataTransfer.items){
                let file = ev.dataTransfer.items[0].getAsFile();
                let file_text_p = file.text();

                file_text_p.then((text) =>{
                    let dim_parser = new DimensionParser();
                    let dimensions = dim_parser.parse(text);
                    //This doesnt exist yet for some reason
                    //TODO fix this
                    this.engine_interface.addFootDimensionData(scene_uuid, dimensions);
                });

                //This should probably be registered into Vuex

            }
        }
    }
}
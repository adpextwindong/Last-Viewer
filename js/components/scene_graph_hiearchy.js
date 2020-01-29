//This module recursively builds a Scene graph representation of the 3d scene for debug purposes only.
module.exports = {
    locales : {
        en: {

        },
        jp: {
            'Toggle Visibility': 'TOGGLE VISIBILITY !TODO',
            'Remove from scene': 'REMOVE FROM SCENE !TODO'
        },
    },
    template : `
    <div>
        <div v-for="graph_repr in scene_graph_representation">
            <span>Name : {{ graph_repr.name }} </span>
            <span>Type : {{ graph_repr.type }} </span>
            <span>UUID : {{ graph_repr.scene_uuid }} </span>
            <span>Visibility : {{ graph_repr.visibility }} </span>
            <button type="button" v-on:click="engine_interface.toggleVisibilityUUID(graph_repr.scene_uuid)">{{t('Toggle Visibility')}}</button>
            <button type="button" v-on:click="engine_interface.emitRemoveUUIDRequest(graph_repr.scene_uuid)">{{t('Remove from scene')}}</button>

            <scene_graph_hiearchy v-if="graph_repr.overlay_children !== undefined"
                v-bind:scene_graph_representation="graph_repr.overlay_children"
                v-bind:engine_interface="engine_interface"
                ></scene_graph_hiearchy>
        </div>
    </div>
    `,
    props: ['scene_graph_representation', 'engine_interface'],
    name: 'scene_graph_hiearchy',
}
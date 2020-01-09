module.exports = {
    template : `
    <div>
        <div v-for="graph_repr in scene_graph_representation">
            <span>Name : {{ graph_repr.name }} </span>
            <span>Type : {{ graph_repr.type }} </span>
            <span>UUID : {{ graph_repr.scene_uuid }} </span>
            <span>Visibility : {{ graph_repr.visibility }} </span>
            <button type="button" v-on:click="emitRemoveUUIDRequest(graph_repr.scene_uuid)">Remove from scene</button>

            <scene_graph_hiearchy v-if="graph_repr.overlay_children !== undefined"
                v-bind:scene_graph_representation="graph_repr.overlay_children"
                v-bind:emitRemoveUUIDRequest="emitRemoveUUIDRequest"
                ></scene_graph_hiearchy>
        </div>
    </div>
    `,
    props: ['scene_graph_representation', 'emitRemoveUUIDRequest'],
    name: 'scene_graph_hiearchy',
}

// <div>
// {{ JSON.stringify(scene_graph_representation) }}
// </div>
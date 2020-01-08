module.exports = {
    template : `
        <div>
            {{ JSON.stringify(scene_graph_representation) }}
        </div>
    `,
    props: ['scene_graph_representation'],
}

//TODO make sure the scene graph listener is hooked up to look for changes
const DimensionParser = require('../../loader/dimensions_parser');

//This module displays the dimensions from a dimension.xml file parsed by the scene_graph_hiearchy
module.exports = {
    locales : {
        en: {

        },
        jp: {
        },
    },
    template : `
    <div>
    {{ dimensions }}
    </div>
    `,
    props: ['dimensions'],
    name: 'dimensions',
    methods : {
    }
}
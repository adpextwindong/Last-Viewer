/* 
    We should treat the initial load as an array of trees. Incase multiple scans would like to be looked at once.
    While the first usecase would be inspecting a single scan or foot & last&||insole tree.
    They might want to display many at once.
    [{
            type: foot_pair 
        left: {
            path,
            overlay_children:[{
                    path,
                    children
                },
            ]
        },
        right:{
        }]

    All top level objects should be loaded, positioned in a distributed manner with overlay_children objs loaded
        as children in the scene graph.

    Another example is inspecting a last
    [
        {
            type: last,
            path,
            __load_stash:{ //Property that gets appeneded by loader. Used by subsequent stages
                    load_state
                    landmarks,
                    obj
                },
            overlay_children[], //Recurse on overlay_children


            //Optional
            config:{
                //Details for the engine to setup
                //scene construction details such as how they should be positioned relative to parent?
                relative_position
                relative_rotation
            }
                
        }
    ]
    Pattern match on the foot type. FOOT/LAST/INSOLE/FOOT_PAIR{LEFT,RIGHT}/LAST_PAIR{LEFT,RIGHT}/INSOLE_PAIR{LEFT,RIGHT}


    Traverse the tree and asyncly load all the paths to an "obj" property in the object.
    Recurse on children
    Ideally this schema can be promoted to its own javascript class so all the files can reference it
 */

const OBJ_TYPES = [
    "FOOT",
    "INSOLE",
    "LAST",
    "FOOT_PAIR"
]

export default class {
    constructor(name, path, type, overlay_children = [], config={}){
        this.name = name;
        this.path = path;
        this.type = type;

        this.overlay_children = overlay_children; //These should be load graphs as well?
        this.config = config;
    }
}
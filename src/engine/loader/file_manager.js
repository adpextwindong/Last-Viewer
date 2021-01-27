//The file manager should have an api for reading a loadtree, building a list of files to load asyncronously.
//Then it should hand the loaded obj's off to the SceneManager for it to manage

//It should crawl the loadTree, build a list of nodes.
//Use a promise based async loader
//Once all promises are done pass it off to the SceneManager

//Scene Manager accepts a LoadTree and scene UUID that can be undefined. If its defined then that UUID is the parent for the subLoadTree.
//This will allow for loading during presentation in a later stage.

//In the file manager we just need to store a HashMap<FileName, File>
//The scene manager can manage the metadata of HashMap<UUID, FileName>
//I want original files in this layer, THREE.obj's in the scene manager.

//Ontop of those features
//I'd like to centralize metadata, file caching, seperate network loading details away from the LoadTree.

class FileManager{
    constructor(initial_load_tree = undefined, scene_manager_ref){
        this.scene_manager_ref = scene_manager_ref;
        this.file_map = new Map(); //We can use filename keys for now as long as this is centralized.

        if(initial_load_tree){
            this.load(initial_load_tree);
            this.scene_manager_ref.processLoadedTree(initial_load_tree);
        }
    }
}
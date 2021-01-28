import * as THREE from 'three';

import OBJLoader from "../../../lib/vendor/three_loader_custom";
import STLLoader from "../../../lib/vendor/STLLoader";

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

//I would like this to be uncoupled from the scene_manager as much as possib le.


const FILE_REGEXPS = Object.freeze({
    wavefront_obj : /\w+(\.obj)$/i,
    stl : /\w+(\.stl)$/i
});

//This should be a result monad honestly
const PARSABLE_FILETYPES = Object.freeze({
    OBJ : Symbol("OBJ"),
    STL : Symbol("STL"),
    INVALID : Symbol("INVALID"),
});

const parse_file_type = (path) => {
    if(FILE_REGEXPS.wavefront_obj.test(path)){
        return PARSABLE_FILETYPES.OBJ;
    }

    if(FILE_REGEXPS.stl.test(path)){
        return PARSABLE_FILETYPES.STL;
    }

    //Failure case to catch unusable filetypes
    return PARSABLE_FILETYPES.INVALID;
};


class FileManager{
    constructor(){
        this.file_map = new Map(); //We can use filename keys for now as long as this is centralized.
        this.response_text_map = new Map();
    }

    //load :: LoadTree -> Promise.allSettled([Promise IO()])
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled#using_promise.allsettled
    //Traverses the tree for all files to load
    //Loads them in a webworker
    //On completion the Tree is fully loaded and ready for the scene manager


    //NOTE HASHS FOR NOW ARE JUST FILE PATHS
    load(loadTree){
        let filesToLoad = new Set(); //Map<Hash, [nodes]>

        loadTree.traverseAndApplyRecursively((load_tree_node)=>{
            //check map
            //ORIGINAL HASH DEFINITION
            let desired_path = load_tree_node.path;
            let fileHash = load_tree_node.hash();

            //TODO implement caching
            if(this.file_map.has(fileHash)){
                //Cached path.
                //Do nothing.
            }else if(!filesToLoad.has(fileHash)){
                filesToLoad.add({
                    fileHash: fileHash,
                    filePath: desired_path
                });
            }

            //Actually we should just cache objects and clone on SceneGraph load
            //That way we can destroy the scene without care.
        });

        let FileManagerScope = this;
        //TODO write promise based loaders
        let loading_promises = [...filesToLoad].map((load_target) => {
            let { filePath, fileHash } = load_target;

            let loader;
            let file_ext = parse_file_type(filePath);
            switch(file_ext){
                case PARSABLE_FILETYPES.OBJ:
                    loader = new OBJLoader();
                    break;
                case PARSABLE_FILETYPES.STL:
                    loader = new STLLoader.STLLoader();
                    break;
                default:
                    loader = undefined;
                    console.log("Unparsable filetype");
            }
            //We need to determine the loader and use it in the promise
            return new Promise((resolve, reject)=>{
                //TODO load file
                if(loader === undefined){
                    reject();//Hmm i'm not sure if we should resolve or reject
                }else{
                    let obj;

                    if(file_ext === PARSABLE_FILETYPES.OBJ){
                        loader.load(filePath, function(response_text_obj_pair){
                            obj = response_text_obj_pair.obj;
                            let text = response_text_obj_pair.text;

                            //TODO this should probably trigger a Vuex command for the landmark store to handle them or something in the scene manager
                            FileManagerScope.response_text_map.set(fileHash, text);
                            //TODO handle metadata such as MODEL TYPE, name, TEXT

                            FileManagerScope.file_map.set(fileHash, obj);
                            resolve(obj);
                        });
                    }else if(file_ext === PARSABLE_FILETYPES.STL){
                        loader.load(filePath, function(result){
                            const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
                            const model = new THREE.Mesh(result, material);
                            const group = new THREE.Group();
                            group.add(model);

                            obj = group;
                                    
                            FileManagerScope.file_map.set(fileHash, obj);
                            resolve(obj);
                        });
                    }
                }
            });
        });

        return Promise.allSettled(loading_promises);
        //Map over filesToLoadSet and chain it to a single promise.

        //Lets use a map because I don't want to load the same file twice, we can iterate over the map too.
        //Map files to load to Promises loaded by their respective loaders

        //Make sure each file gets mapped into the file map
        //Return the tree as a promise to be handled by the scene manager

        //TODO !unimplemented()
        //TODO SceneManager side of processing a loaded tree
    }

    //Only to be used with a Loaded LoadTree
    //args correspond to Threejs Object.clone 
    //.clone ( recursive : Boolean ) : Object3D
    //recursive -- if true, descendants of the object are also cloned. Default is true.
    //Returns a clone of this object and optionally all descendants.
    cloneCachedHash(hash, ...args){
        console.assert(this.file_map.has(hash), "This hash is not cached %s", hash);
        return this.file_map.get(hash).clone(args);
    }

    getCachedDirect(hash){
        return this.file_map.get(hash);
    }

    //Idea
    //Map<Hash, WeakSet{obj's using the file}
    /*
    gcFiles(FileHashs, scene_manager_ref){
        //Check scene_manager's Map<FileHash, [scene_uuids]>
        //If the list is empty for a given FileHash key then gc the File.

        if(this.scene_manager_ref){
            FileHashs.forEach((hash) =>{
                //TODO
                //scene_manager_ref.readyForGC(FileHash);
                //delete this.file_map[FileHash]
                //this.file_map.delete(FileHash); //Explicitly remove key    
            });
        }
    } */
}

export default FileManager;
import * as THREE from 'three';

import OBJLoader from "../../../lib/vendor/three_loader_custom";
import STLLoader from "../../../lib/vendor/STLLoader";

//I'd like to centralize metadata, file caching, seperate network loading details away from the LoadTree.

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
            let fileName = load_tree_node.name;
            //TODO implement caching
            if(this.file_map.has(fileHash)){
                //Cached path.
                //Do nothing.
            }else if(!filesToLoad.has(fileHash)){
                filesToLoad.add({
                    fileHash: fileHash,
                    filePath: desired_path,
                    fileName: fileName
                });
            }

            //Actually we should just cache objects and clone on SceneGraph load
            //That way we can destroy the scene without care.
        });

        let FileManagerScope = this;
        //TODO write promise based loaders
        let loading_promises = [...filesToLoad].map((load_target) => {
            let { filePath, fileHash, fileName } = load_target;

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
                    file_ext = parse_file_type(fileName); //Fallback onto filename for DragNDrop loader
                    switch(file_ext){
                        case PARSABLE_FILETYPES.OBJ:
                            loader = new OBJLoader();
                            break;
                        case PARSABLE_FILETYPES.STL:
                            loader = new STLLoader.STLLoader();
                            break;
                        default:
                            loader = undefined;
                            break;
                    }
                    break;
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
    }

    //Only to be used with a Loaded LoadTree
    //args correspond to Threejs Object.clone 
    //.clone ( recursive : Boolean ) : Object3D
    //recursive -- if true, descendants of the object are also cloned. Default is true.
    //Returns a clone of this object and optionally all descendants.

    //TODO Figure out why this isn't working. We might need to do a deep copy or something.
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
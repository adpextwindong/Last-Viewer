//This is a base class for Tree related types like a LoadTree and Scene Graph (not really a graph)
//I wanted to seperate loading from scene manipulation and handling.
//But retain the flexibility of using a tree.

//Overlay Children is a list
//Parent is just a reference to whomever owns this tree (not really enforced)
class Tree {
    //data LoadTree :: this [trees] parent_reference //The children tree
    constructor(overlay_children = undefined, parent=undefined){
        this.overlay_children = overlay_children
        
        if(this.overlay_children){
            this.overlay_children = overlay_children;//These are also trees
            this.overlay_children.forEach(c => {
                c.parent = this;
            });
        }

        this.parent = parent;
    }

    //data Tree = this [children trees]
    //Extend this to add properties to this
    //This class is primarily to keep tree methods in one place because scene_graph and load_tree are similar

    //predicate :: tree -> bool
    someChildren(predicate){
        if(this.overlay_children){
            return this.overlay_children.some(predicate);
        }else{
            return false;
        }
    }
    //TODO rewrite __pendingChildren()



    //TODO testing
    traverseFor(property, ...args){
        if(this[property] === args){
            return [this];
        }else{
            if(this.overlay_children){
                return this.overlay_children.flatMap(child => child.traverseFor(property, args));
            }else{
                return [];
            }
        }
    }

    traverseAndApplyRecursively(f){
        f(this);
        if(this.overlay_children){
            this.overlay_children.forEach(c => c.traverseAndApplyRecursively(f));
        }
    }

    removeChild(tree){
        if(this.overlay_children.includes(tree)){
            tree.parent = null;
            this.overlay_children.splice(this.overlay_children.indexOf(tree),1);
            //Recursively remove from tree?
            if(this.overlay_children.length === 0){
                this.overlay_children = undefined;
            }
        }
    }
}

export default Tree;

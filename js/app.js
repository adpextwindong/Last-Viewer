const AppStates = Object.freeze({
    PICKING:   Symbol("picking"),
    LOADING:  	Symbol("loading"),
    LOADED: 	Symbol("loaded")
	});


const sleep = m => new Promise(r => setTimeout(r, m))

var obj;

var app = new Vue({
    el: '#app',
    data: {
        scans: [
        { path: './data/foot1.obj' },
        { path: './data/foot2.obj' },
        { path: './data/foot3.obj' }
        ],

        AppStates : AppStates,
        AppState : null,
    },
    methods : {

        //TODO replace this with an async load call to loadOBJ
        //TODO probably should be async
        async loadViewer (path) {
            console.log("recieved click for path " + path);
            this.AppState = AppStates.LOADING;
            //TODO Spruce up the css for the loadscreen
            console.log("now loading...");

            await sleep(100);

            var loader = new THREE.OBJLoader();
            var scope = this;
            loader.load(path, function(response_obj){
                    console.log("loaded");
                    this.AppState = AppStates.LOADED;
                    Viewer.init(scope.$el, response_obj);
                    Viewer.animateLoop();
                }
            )
        },
    },

    //TODO is this necessary?
    created : function() {
        Object.freeze(this.AppStates);
        this.AppState = this.AppStates.PICKING;
    }

})

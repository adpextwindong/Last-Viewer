/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Mark Lundin 	/ http://mark-lundin.com
 * @author Simone Manini / http://daron1337.github.io
 * @author Luca Antiga 	/ http://lantiga.github.io

 ** three-trackballcontrols module
 ** @author Jon Lim / http://jonlim.ca

This file was MIT licensed from the THREEJS REPO JSM CONTROLS.

It has been modified for my use in last viewer. Mostly converted this to a class so my linter would stop complaining.
 */

//var THREE = window.THREE || require('three');
import * as THREE from "three";

/*
{ Vector3,
		Quaternion,
		Vector2,
        EventDispatcher}
*/

//var TrackballControls;
const STATE = { NONE: - 1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4 };

const changeEvent = { type: 'change' };
const startEvent = { type: 'start' };
const endEvent = { type: 'end' };

const EPS = 0.000001;
// helpers
function containsKey(keys, key) {
    if (Array.isArray(keys)) {
        return keys.indexOf(key) !== -1;
    } else {
        return keys === key;
    }
}

//function preventEvent( event ) { event.preventDefault(); }

class TrackballControls {
    constructor(object, domElement, rafHandler){
        this.object = object;
        this.domElement = ( domElement !== undefined ) ? domElement : document;

        //CUSTOM RAFHANDLER
        this.rafHandler = rafHandler;

		// API
        this.enabled = true;

        this.screen = { left: 0, top: 0, width: 0, height: 0 };

        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.2;
        this.panSpeed = 0.3;

        this.noRotate = false;
        this.noZoom = false;
        this.noPan = false;

        this.staticMoving = false;
        this.dynamicDampingFactor = 0.2;

        this.minDistance = 0;
        this.maxDistance = Infinity;

        /**
         * `KeyboardEvent.keyCode` values which should trigger the different
         * interaction states. Each element can be a single code or an array
         * of codes. All elements are required.
         */
        this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

        // internals

        this.target = new THREE.Vector3();


        this.lastPosition = new THREE.Vector3();

        this.state = STATE.NONE,
        this.prevState = STATE.NONE,

        this.eye = new THREE.Vector3(),

        this.movePrev = new THREE.Vector2(),
        this.moveCurr = new THREE.Vector2(),

        this.lastAxis = new THREE.Vector3(),
        this.lastAngle = 0,

        this.zoomStart = new THREE.Vector2(),
        this.zoomEnd = new THREE.Vector2(),

        this.touchZoomDistanceStart = 0,
        this.touchZoomDistanceEnd = 0,

        this.panStart = new THREE.Vector2(),
        this.panEnd = new THREE.Vector2();

        // for reset

        this.target0 = this.target.clone();
        this.position0 = this.object.position.clone();
        this.up0 = this.object.up.clone();

        this.bindEventHandlers;
    }
	//var _this = this;

	// methods

	handleResize() {

		if ( this.domElement === document ) {

			this.screen.left = 0;
			this.screen.top = 0;
			this.screen.width = window.innerWidth;
			this.screen.height = window.innerHeight;

		} else {

			var box = this.domElement.getBoundingClientRect();
			// adjustments come from similar code in the jquery offset() function
			var d = this.domElement.ownerDocument.documentElement;
			this.screen.left = box.left + window.pageXOffset - d.clientLeft;
			this.screen.top = box.top + window.pageYOffset - d.clientTop;
			this.screen.width = box.width;
			this.screen.height = box.height;

		}

	}

	handleEvent( event ) {

		if ( typeof this[ event.type ] == 'function' ) {

			this[ event.type ]( event );

		}

	}

	getMouseOnScreen(pageX, pageY){

		let vector = new THREE.Vector2();

        vector.set(
            ( pageX - this.screen.left ) / this.screen.width,
            ( pageY - this.screen.top ) / this.screen.height
        );

        return vector;
	}

	getMouseOnCircle( pageX, pageY ){

		let vector = new THREE.Vector2();

        vector.set(
            ( ( pageX - this.screen.width * 0.5 - this.screen.left ) / ( this.screen.width * 0.5 ) ),
            ( ( this.screen.height + 2 * ( this.screen.top - pageY ) ) / this.screen.width ) // screen.width intentional
        );

        return vector;

	}

	rotateCamera() {

		let axis = new THREE.Vector3(),
			quaternion = new THREE.Quaternion(),
			eyeDirection = new THREE.Vector3(),
			objectUpDirection = new THREE.Vector3(),
			objectSidewaysDirection = new THREE.Vector3(),
			moveDirection = new THREE.Vector3(),
			angle;

        moveDirection.set( this.moveCurr.x - this.movePrev.x, this.moveCurr.y - this.movePrev.y, 0 );
        angle = moveDirection.length();

        if ( angle ) {

            this.eye.copy( this.object.position ).sub( this.target );

            eyeDirection.copy( this.eye ).normalize();
            objectUpDirection.copy( this.object.up ).normalize();
            objectSidewaysDirection.crossVectors( objectUpDirection, eyeDirection ).normalize();

            objectUpDirection.setLength( this.moveCurr.y - this.movePrev.y );
            objectSidewaysDirection.setLength( this.moveCurr.x - this.movePrev.x );

            moveDirection.copy( objectUpDirection.add( objectSidewaysDirection ) );

            axis.crossVectors( moveDirection, this.eye ).normalize();

            angle *= this.rotateSpeed;
            quaternion.setFromAxisAngle( axis, angle );

            this.eye.applyQuaternion( quaternion );
            this.object.up.applyQuaternion( quaternion );

            this.lastAxis.copy( axis );
            this.lastAngle = angle;

        } else if ( ! this.staticMoving && this.lastAngle ) {

            this.lastAngle *= Math.sqrt( 1.0 - this.dynamicDampingFactor );
            this.eye.copy( this.object.position ).sub( this.target );
            quaternion.setFromAxisAngle( this.lastAxis, this.lastAngle );
            this.eye.applyQuaternion( quaternion );
            this.object.up.applyQuaternion( quaternion );

        }

        this.movePrev.copy( this.moveCurr );

	}


	zoomCamera() {

		let factor;

		if ( this.state === STATE.TOUCH_ZOOM_PAN ) {

			factor = this.touchZoomDistanceStart / this.touchZoomDistanceEnd;
			this.touchZoomDistanceStart = this.touchZoomDistanceEnd;
			this.eye.multiplyScalar( factor );

		} else {

			factor = 1.0 + ( this.zoomEnd.y - this.zoomStart.y ) * this.this.zoomSpeed;

			if ( factor !== 1.0 && factor > 0.0 ) {

				this.eye.multiplyScalar( factor );

			}

			if ( this.staticMoving ) {

				this.zoomStart.copy( this.zoomEnd );

			} else {

				let diff = ( this.zoomEnd.y - this.zoomStart.y ) * this.dynamicDampingFactor;
				this.zoomStart.y += diff;

				if(diff > 0.0001){
					this.rafHandler();
				}
				// console.log("Zoom diff: " + (diff < 0.0001));
				//TODO we need to stopRAF'ing as soon as zoomStart - zoomEnd hits zero
				// rafHandler();
			}

		}

	}

	panCamera() {

		let mouseChange = new THREE.Vector2(),
			objectUp = new THREE.Vector3(),
			pan = new THREE.Vector3();

        mouseChange.copy( this.panEnd ).sub( this.panStart );

        if ( mouseChange.lengthSq() ) {

            mouseChange.multiplyScalar( this.eye.length() * this.panSpeed );

            pan.copy( this.eye ).cross( this.object.up ).setLength( mouseChange.x );
            pan.add( objectUp.copy( this.object.up ).setLength( mouseChange.y ) );

            this.object.position.add( pan );
            this.target.add( pan );

            if ( this.staticMoving ) {

                this.panStart.copy( this.panEnd );

            } else {

                this.panStart.add( mouseChange.subVectors( this.panEnd, this.panStart ).multiplyScalar( this.dynamicDampingFactor ) );

            }

        }

	}

	checkDistances() {

		if ( ! this.noZoom || ! this.noPan ) {

			if ( this.eye.lengthSq() > this.maxDistance * this.maxDistance ) {

				this.object.position.addVectors( this.target, this.eye.setLength( this.maxDistance ) );
				this.zoomStart.copy( this.zoomEnd );

			}

			if ( this.eye.lengthSq() < this.minDistance * this.minDistance ) {

				this.object.position.addVectors( this.target, this.eye.setLength( this.minDistance ) );
				this.zoomStart.copy( this.zoomEnd );

			}

		}

	}

    update() {

		this.eye.subVectors( this.object.position, this.target );

		if ( ! this.noRotate ) {

			this.rotateCamera();

		}

		if ( ! this.noZoom ) {

			this.zoomCamera();

		}

		if ( ! this.noPan ) {

			this.panCamera();

		}

		this.object.position.addVectors( this.target, this.eye );

		this.checkDistances();

		this.object.lookAt( this.target );

		if ( this.lastPosition.distanceToSquared( this.object.position ) > EPS ) {

			this.dispatchEvent( changeEvent );

			this.lastPosition.copy( this.object.position );

		}

	}

	reset() {

		this.state = STATE.NONE;
		this.prevState = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );
		this.object.up.copy( this.up0 );

		this.eye.subVectors( this.object.position, this.target );

		this.object.lookAt( this.target );

		this.dispatchEvent( changeEvent );

		this.lastPosition.copy( this.object.position );

	}


	/**
	 * Checks if the pressed key is any of the configured modifier keys for
	 * a specified behavior.
	 *
	 * @param {number | number[]} keys
	 * @param {number} key
	 *
	 * @returns {boolean} `true` if `keys` contains or equals `key`
	 */
	// listeners

	keydown( event ) {

		if ( this.enabled === false ) return;

		window.removeEventListener( 'keydown', this.keydown );

		this.prevState = this.state;

		if ( this.state !== STATE.NONE ) {

			return;

		} else if ( containsKey( this.keys[ STATE.ROTATE ], event.keyCode ) && ! this.noRotate ) {

			this.state = STATE.ROTATE;

		} else if ( containsKey( this.keys[ STATE.ZOOM ], event.keyCode ) && ! this.noZoom ) {

			this.state = STATE.ZOOM;

		} else if ( containsKey( this.keys[ STATE.PAN ], event.keyCode ) && ! this.noPan ) {

			this.state = STATE.PAN;

		}

	}

    //Event handler
	keyup() {

		if ( this.enabled === false ) return;

		this.state = this.prevState;

		window.addEventListener( 'keydown', this.keydown, false );

	}

    mousedown( event ) {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( this.state === STATE.NONE ) {

			this.state = event.button;

		}

		if ( this.state === STATE.ROTATE && ! this.noRotate ) {

			this.moveCurr.copy( this.getMouseOnCircle( event.pageX, event.pageY ) );
			this.movePrev.copy( this.moveCurr );

		} else if ( this.state === STATE.ZOOM && ! this.noZoom ) {

			this.zoomStart.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
			this.zoomEnd.copy( this.zoomStart );

		} else if ( this.state === STATE.PAN && ! this.noPan ) {

			this.panStart.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );
			this.panEnd.copy( this.panStart );

		}

		document.addEventListener( 'mousemove', this.mousemove, false );
		document.addEventListener( 'mouseup', this.mouseup, false );

		this.dispatchEvent( startEvent );

	}

	mousemove( event ) {

		if ( this.this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		if ( this.state === STATE.ROTATE && ! this.noRotate ) {

			this.movePrev.copy( this.moveCurr );
			this.moveCurr.copy( this.getMouseOnCircle( event.pageX, event.pageY ) );

		} else if ( this.state === STATE.ZOOM && ! this.noZoom ) {

			this.zoomEnd.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );

		} else if ( this.state === STATE.PAN && ! this.noPan ) {

			this.panEnd.copy( this.getMouseOnScreen( event.pageX, event.pageY ) );

		}

	}

	mouseup( event ) {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		this.state = STATE.NONE;

		document.removeEventListener( 'mousemove', this.mousemove );
		document.removeEventListener( 'mouseup', this.mouseup );
		this.dispatchEvent( endEvent );

	}

	mousewheel( event ) {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.deltaMode ) {

			case 2:
				// Zoom in pages
				this.zoomStart.y -= event.deltaY * 0.025;
				break;

			case 1:
				// Zoom in lines
				this.zoomStart.y -= event.deltaY * 0.01;
				break;

			default:
				// undefined, 0, assume pixels
				this.zoomStart.y -= event.deltaY * 0.00025;
				break;

		}

		this.dispatchEvent( startEvent );
		this.dispatchEvent( endEvent );

	}

	touchstart( event ) {

		if ( this.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:
				this.state = STATE.TOUCHthis.ROTATE;
				this.moveCurr.copy( this.getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				this.movePrev.copy( this.moveCurr );
				break;

			default: // 2 or more
				this.state = STATE.TOUCHthis.ZOOMthis.PAN;
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				this.touchZoomDistanceEnd = this.touchZoomDistanceStart = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				this.panStart.copy( this.getMouseOnScreen( x, y ) );
				this.panEnd.copy( this.panStart );
				break;

		}

		this.dispatchEvent( startEvent );

	}

	touchmove( event ) {

		if ( this.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1:
				this.movePrev.copy( this.moveCurr );
				this.moveCurr.copy( this.getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				break;

			default: // 2 or more
				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				this.touchZoomDistanceEnd = Math.sqrt( dx * dx + dy * dy );

				var x = ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX ) / 2;
				var y = ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY ) / 2;
				this.panEnd.copy( this.getMouseOnScreen( x, y ) );
				break;

		}

	}

	touchend( event ) {

		if ( this.enabled === false ) return;

		switch ( event.touches.length ) {

			case 0:
				this.state = STATE.NONE;
				break;

			case 1:
				this.state = STATE.TOUCHthis.ROTATE;
				this.moveCurr.copy( this.getMouseOnCircle( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY ) );
				this.movePrev.copy( this.moveCurr );
				break;

		}

		this.dispatchEvent( endEvent );

	}

	contextmenu( event ) {

		if ( this.enabled === false ) return;

		event.preventDefault();

	}

	dispose() {

		this.domElement.removeEventListener( 'contextmenu', this.contextmenu, false );
		this.domElement.removeEventListener( 'mousedown', this.mousedown, false );
		this.domElement.removeEventListener( 'wheel', this.mousewheel, false );

		this.domElement.removeEventListener( 'touchstart', this.touchstart, false );
		this.domElement.removeEventListener( 'touchend', this.touchend, false );
		this.domElement.removeEventListener( 'touchmove', this.touchmove, false );

		document.removeEventListener( 'mousemove', this.mousemove, false );
		document.removeEventListener( 'mouseup', this.mouseup, false );

		window.removeEventListener( 'keydown', this.keydown, false );
		window.removeEventListener( 'keyup', this.keyup, false );

	}

    bindEventHandlers(){
        this.domElement.addEventListener( 'contextmenu', this.contextmenu, false );
        this.domElement.addEventListener( 'mousedown', this.mousedown, false );
        this.domElement.addEventListener( 'wheel', this.mousewheel, false );

        this.domElement.addEventListener( 'touchstart', this.touchstart, false );
        this.domElement.addEventListener( 'touchend', this.touchend, false );
        this.domElement.addEventListener( 'touchmove', this.touchmove, false );

        window.addEventListener( 'keydown', this.keydown, false );
        window.addEventListener( 'keyup', this.keyup, false );

        this.handleResize();

        // force an update at start
        this.update();
    }
}


TrackballControls.prototype = Object.create( THREE.EventDispatcher.prototype );

export default TrackballControls;

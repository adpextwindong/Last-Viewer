// MIT LICENSED FROM https://github.com/jeromeetienne/threex.windowresize
// This THREEx helper makes it easy to handle window resize.
// It will update renderer and camera when window is resized.
//
// # Usage
//
// **Step 1**: Start updating renderer and camera
//
// ```var windowResize = THREEx.WindowResize(aRenderer, aCamera)```
//    
// **Step 2**: Start updating renderer and camera
//
// ```windowResize.stop()```
// # Code

//

'use strict';
//Pass in the threex namespace
module.exports = function (THREEx) {
	/**
	 * Update renderer and camera when the window is resized
	 * 
	 * @param {Object} renderer the renderer to update
	 * @param {Object} Camera the camera to update
	*/
	THREEx.WindowResize = function (renderer, camera) {
		var callback = function () {
			// notify the renderer of the size change
			renderer.setSize(window.innerWidth, window.innerHeight);
			// update the camera
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
		}
		// bind the resize event
		window.addEventListener('resize', callback, false);
		// return .stop() the function to stop watching window resize
		return {
			/**
			 * Stop watching window resize
			*/
			stop: function () {
				window.removeEventListener('resize', callback);
			}
		};
	};

	THREEx.ResizeForWidthOffset = function (renderer, camera, target_elem, controls) {
		var callback = function () {
			//TODO PERFORMANCE This might be extremely slow.
			let computed_css_width = parseInt(getComputedStyle(target_elem).width);

			renderer.setSize(computed_css_width, window.innerHeight);
			camera.aspect = computed_css_width / window.innerHeight;
			camera.updateProjectionMatrix();
			controls.handleResize();
		}

		// bind the resize event
		window.addEventListener('resize', callback, false);
		// return .stop() the function to stop watching window resize
		return {
			/**
			 * Stop watching window resize
			*/
			stop: function () {
				window.removeEventListener('resize', callback);
			}
		};
	}

}
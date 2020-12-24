module.exports = {
    
    //Returns a quaternion rotation between src vector to the dst vector
    rotationBetweenVectors(src, dst){
        let start = new THREE.Vector3();
        start.copy(src);
        start.normalize();

        let dest = new THREE.Vector3();
        dest.copy(dst);
        dest.normalize();

        let cosTheta = start.dot(dest);
        let rotationAxis = new THREE.Vector3();

        if(cosTheta < -1 + 0.001){
            //special case opposite directions
            rotationAxis.crossVectors(start, new THREE.Vector3(0.0,0.0,1.0));
            if(rotationAxis.lengthSq() < 0.01){
                //Parallel, try again
                rotationAxis.crossVectors(start, new THREE.Vector3(1.0,0.0,0.0));
            }
            rotationAxis.normalize();
            let ret = new THREE.Quaternion();
            ret.setFromAxisAngle(rotationAxis, Math.PI);
            return ret;
        }

        rotationAxis.crossVectors(start, dest);

        let s = Math.sqrt( (1 + cosTheta) * 2);
        let inverseS = 1 / s;

        return new THREE.Quaternion(rotationAxis.x * inverseS,
            rotationAxis.y * inverseS,
            rotationAxis.z * inverseS,
            s * 0.5);
    }


}

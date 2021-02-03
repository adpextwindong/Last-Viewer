//from https://gist.github.com/renaudtertrais/25fc5a2e64fe5d0e86894094c6989e10
const zip = (arr, ...arrs) => {
    return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
}

class Landmark {
    constructor(description, group_name){
        this.description = description;
        this.group_name = group_name;
    }
}

// type landmark = (String `description`, String `group_name`)
// parseLandmarkTextToList :: text (OBJ file w/ landmarks) -> [Landmark]
const LandmarkParser = {
    parseLandmarks(text){
        //Parses the obj textfile for the landmark descriptions and group names.
        //This assumes all landmark groups are always preceeded by a description line
        //# Pternion     -> Evens
        //g landmark_0   -> Odds
        let xs = text.split('\n').filter(s => s[0] === '#' || s[0] === 'g');//.slice(2);
        let evens = xs.filter((s, line_index) => line_index % 2 === 0);
        let odds = xs.filter((s, line_index) => line_index % 2 === 1);
        
        //slice(2) in this case drops the leading "# " and "g " line markers in the obj format


        //TODO TASK PREDEPLOYMENT figure out what we should do with the "This file was created by FileConverter" description.
        //Should this translation be done at load time or at the presentation template level
        //landmarks schema

        return zip(evens,odds).map((line_pair) => {
            let landmark = new Landmark(
                line_pair[0] ? line_pair[0].slice(2).trim() : "", //'description'
                line_pair[1] ? line_pair[1].slice(2).trim() : ""  //'group_name'
            );
            //TODO REFACTOR LANDMARK METADATA 
            //This isActive stuff should be a Vuex level detail
            //TODO MOVE THIS
            //'isActive': false //Handling is done in store/modules/landmarks.js

            console.log(landmark.description);
            console.log(landmark.group_name);
            //LM44, 45 & 46 have no descriptions still.
            //TODO maybe make a lookup table for these.

            return landmark;
        });
    }
}

export {
    Landmark,
    LandmarkParser
};
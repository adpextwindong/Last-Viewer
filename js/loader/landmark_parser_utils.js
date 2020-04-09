//from https://gist.github.com/renaudtertrais/25fc5a2e64fe5d0e86894094c6989e10
const zip = (arr, ...arrs) => {
    return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
}

module.exports = {
    parseLandmarkTextToList(text){
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
            let landmark = {
                'description': line_pair[0] ? line_pair[0].slice(2).trim() : "",
                'group_name': line_pair[1] ? line_pair[1].slice(2).trim() : "",
                'isActive': false
            };

            console.log(landmark.description);
            console.log(landmark.group_name);
            //LM44, 45 & 46 have no descriptions still.
            //WISHLIST maybe make a lookup table for these.

            return landmark;
        });
    }
}
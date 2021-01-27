//TODO import zip from utils
const zip = (arr, ...arrs) => {     return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val])); }

const convertDomToDict = (dom) => {
    let dict = {};
    //getElementsByTagName returns an HTMLCollection without a map function so it has to be spread into an empty array
    [...dom.getElementsByTagName("*")].map((elem) =>{
        dict[elem.tagName] = elem.textContent;
    })

    return dict;
};

function mergeLeftRightDicts(ls, rs){
    let lks = Object.keys(ls);
    let rks = Object.keys(rs).filter((x) => lks.includes(x));
    let keys = [...lks, ...rks];

    let pairs = keys.map(k => [ls[k], rs[k]]);

    return zip(keys,pairs);
}

module.exports = class DimensionsXMLParser{
    constructor(){
        this.parser = new DOMParser();
    }
    parse(text){
        //This xml really should be text/xml because the user should be able to read it
        let dimensionsDOM = this.parser.parseFromString(text, "text/xml");
    
        let left = this.__parseLeft(dimensionsDOM);
        let right = this.__parseRight(dimensionsDOM);

        return mergeLeftRightDicts(left, right);
    }

    __parseLeft(dom){
        let leftDom = dom.querySelector("dimension[foot=left]");
        return convertDomToDict(leftDom);
    }
    __parseRight(dom){
        let rightDom = dom.querySelector("dimension[foot=right]");
        return convertDomToDict(rightDom);
    }
}
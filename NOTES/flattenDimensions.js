//OPEN file and parse dimensions
text = `<foot_dimension version="1.1.1">
<header>
    <foot_id>1Q0DRTS7V9EW</foot_id>
    <user_name>GEORGE CRARY</user_name>
    <gender>Male</gender>
    <birth_year>1996</birth_year>
    <height>172</height>
    <weight>58</weight>
    <scan_date>2019-09-30</scan_date>
    <scan_time>16:21:00</scan_time>
    <sports>26</sports>
    <posture>half_weight</posture>
    <condition>no_socks</condition>
    <file_name>201909301621</file_name>
    <key>563e5f30595f983eac9576b9c079e330</key>
    <infoot_id>16A00000000000</infoot_id>
</header>
<dimensions>
    <dimension foot="right">
        <foot_len>249.8</foot_len>
        <foot_len2>0</foot_len2>
        <girth_circum>232.4</girth_circum>
        <foot_width>94.4</foot_width>
        <instep_circum>238.9</instep_circum>
        <instep_circum2>237.1</instep_circum2>
        <heel_width>65</heel_width>
        <heel_width2>66.9</heel_width2>
        <instep_len>182.6</instep_len>
        <instep_len2>0</instep_len2>
        <fib_instep_len>166.9</fib_instep_len>
        <fib_instep_len2>0</fib_instep_len2>
        <girth_height>41.8</girth_height>
        <instep_height>64.7</instep_height>
        <instep_height2>59.9</instep_height2>
        <toe1_angle>9</toe1_angle>
        <toe1_angle2>3.4</toe1_angle2>
        <toe5_angle>9.6</toe5_angle>
        <toe5_angle2>3.3</toe5_angle2>
        <toe1_height>0</toe1_height>
        <toe5_height>0</toe5_height>
        <navi_height>36.3</navi_height>
        <sphy_fib_height>0</sphy_fib_height>
        <sphy_height>0</sphy_height>
        <lat_mall_height>0</lat_mall_height>
        <med_mall_height>0</med_mall_height>
        <arch_length>0</arch_length>
        <heel_angle>1.4</heel_angle>
        <heel_girth_circum>315.2</heel_girth_circum>
        <hori_ankle_circum>244.8</hori_ankle_circum>
        <calf_circum>0</calf_circum>
        <foot_width2>92.9</foot_width2>
        <heel_sphy_len>0</heel_sphy_len>
        <heel_sphy_fib_len>0</heel_sphy_fib_len>
        <heel_navicular_len>88.4</heel_navicular_len>
        <lat_mall_achilles_len>0</lat_mall_achilles_len>
        <med_mall_achilles_len>0</med_mall_achilles_len>
        <cp_of_lm_achilles_len>0</cp_of_lm_achilles_len>
    </dimension>
    <dimension foot="left">
        <foot_len>252.2</foot_len>
        <foot_len2>0</foot_len2>
        <girth_circum>232.4</girth_circum>
        <foot_width>94.7</foot_width>
        <instep_circum>238.3</instep_circum>
        <instep_circum2>235.7</instep_circum2>
        <heel_width>62.7</heel_width>
        <heel_width2>63.5</heel_width2>
        <instep_len>183.8</instep_len>
        <instep_len2>0</instep_len2>
        <fib_instep_len>168.9</fib_instep_len>
        <fib_instep_len2>0</fib_instep_len2>
        <girth_height>41.7</girth_height>
        <instep_height>64.9</instep_height>
        <instep_height2>59.1</instep_height2>
        <toe1_angle>10.5</toe1_angle>
        <toe1_angle2>4.3</toe1_angle2>
        <toe5_angle>11.9</toe5_angle>
        <toe5_angle2>5.3</toe5_angle2>
        <toe1_height>0</toe1_height>
        <toe5_height>0</toe5_height>
        <navi_height>33.2</navi_height>
        <sphy_fib_height>0</sphy_fib_height>
        <sphy_height>0</sphy_height>
        <lat_mall_height>0</lat_mall_height>
        <med_mall_height>0</med_mall_height>
        <arch_length>0</arch_length>
        <heel_angle>2.2</heel_angle>
        <heel_girth_circum>313.5</heel_girth_circum>
        <hori_ankle_circum>243.1</hori_ankle_circum>
        <calf_circum>0</calf_circum>
        <foot_width2>93.5</foot_width2>
        <heel_sphy_len>0</heel_sphy_len>
        <heel_sphy_fib_len>0</heel_sphy_fib_len>
        <heel_navicular_len>93</heel_navicular_len>
        <lat_mall_achilles_len>0</lat_mall_achilles_len>
        <med_mall_achilles_len>0</med_mall_achilles_len>
        <cp_of_lm_achilles_len>0</cp_of_lm_achilles_len>
    </dimension>
</dimensions>
</foot_dimension>`;

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
    lks = Object.keys(ls);
    rks = Object.keys(rs).filter((x) => lks.includes(x));
    keys = [...lks, ...rks];
    
    pairs = keys.map(k => [ls[k], rs[k]]);
    
    return zip(keys,pairs);
}

function parseDimensions(text){
    let parser = new DOMParser();
    //This xml really should be text/xml because the user should be able to read it
    let dimensionsDOM = parser.parseFromString(text, "text/xml");

    let leftDom = dimensionsDOM.querySelector("dimension[foot=left]");
    let rightDom = dimensionsDOM.querySelector("dimension[foot=right]");

    let leftDimensions = convertDomToDict(leftDom);
    let rightDimensions = convertDomToDict(rightDom);

    return mergeLeftRightDicts(leftDimensions, rightDimensions);
}

flattened = parseDimensions(text);
console.log(flattened);
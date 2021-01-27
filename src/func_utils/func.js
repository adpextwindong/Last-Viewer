const zip = (arr, ...arrs) => {
    return arr.map((val, i) => arrs.reduce((a, arr) => [...a, arr[i]], [val]));
}

const delta = (xs, ys) => {
    return xs.filter(x => !ys.includes(x));
}
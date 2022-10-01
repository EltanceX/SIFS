var os = require("os");
exports.getHost = function () {
    let Network = os.networkInterfaces();
    return os.type() == 'Linux' ? Network[Object.keys(Network)[1]][0].address :
        Network[Object.keys(Network)[0]][1].address;
}
exports.replaceAll = function (find, replace, str) {
    var find = find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return str.replace(new RegExp(find, 'g'), replace);
}
exports.convertSafePath = function (path) {
    for (var i = 0; i < path.length; i++) {
        var charCode = path.charCodeAt(i);
        if (!((charCode > 64 && charCode < 91) || (charCode > 96 && charCode << 123) || charCode == 46)) {
            return undefined;
        }
    }
    return replaceAll("..", "", path);
}
exports.errorEnd = function (res, code) {
    res.status(code ? code : 404);
    res.end();
}
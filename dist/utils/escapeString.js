"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeString = escapeString;
function escapeString(str) {
    if (typeof str !== "string")
        return str;
    return str.replace(/"/g, '\\"');
}
//# sourceMappingURL=escapeString.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Test_1 = require("./Test");
const decorators_1 = require("~bdo/utils/decorators");
let Test1 = class Test1 extends Test_1.Test {
    constructor(_params) {
        super();
        this.oha = 'test';
    }
};
tslib_1.__decorate([
    decorators_1.property({ storeTemporary: 5000, saveInCache: true }),
    tslib_1.__metadata("design:type", String)
], Test1.prototype, "oha", void 0);
Test1 = tslib_1.__decorate([
    decorators_1.baseConstructor(),
    tslib_1.__metadata("design:paramtypes", [Object])
], Test1);
exports.Test1 = Test1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGVzdDEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvYXBwL21vZGVscy9UZXN0MS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpQ0FBOEI7QUFDOUIsc0RBQWtFO0FBVWxFLElBQWEsS0FBSyxHQUFsQixNQUFhLEtBQU0sU0FBUSxXQUFJO0lBVTNCLFlBQVksT0FBNEI7UUFDcEMsS0FBSyxFQUFFLENBQUM7UUFIa0QsUUFBRyxHQUFXLE1BQU0sQ0FBQztJQUluRixDQUFDO0NBQ0osQ0FBQTtBQUwwRDtJQUF0RCxxQkFBUSxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7O2tDQUE2QjtBQVIxRSxLQUFLO0lBRGpCLDRCQUFlLEVBQUU7O0dBQ0wsS0FBSyxDQWFqQjtBQWJZLHNCQUFLIn0=
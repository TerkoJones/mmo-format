"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("util");
var vm_1 = require("vm");
var stream_1 = require("stream");
var $info = Symbol('mmo-inspect-info');
var $context = Symbol('mmo-context');
var PH_CHAR = '#';
var UNNAMED = PH_CHAR + PH_CHAR;
var SCAPED = '\\\\' + PH_CHAR;
var CONTENT = '[\\s\\u0021-\\u0022\\u0024-\\uffff]|(?<=\\\\)' + PH_CHAR;
var STRING_PATTERN = SCAPED + '|' + UNNAMED + '|' + PH_CHAR + '(' + CONTENT + ')+' + PH_CHAR;
var STREAM_PATTERN = STRING_PATTERN + '|' + PH_CHAR + '(' + CONTENT + ')*$';
var UNNAMED_PATTERN = SCAPED + '|' + UNNAMED;
var REX_SCAPED = new RegExp(SCAPED, 'g');
var REX_STRING = new RegExp(STRING_PATTERN, 'g');
var REX_STREAM = new RegExp(STREAM_PATTERN, 'g');
var REX_UNNAMED = new RegExp(UNNAMED_PATTERN, 'g');
function inspect_object(object, options) {
    if (object[$info] && object[$info].inspect) {
        if (object[$info].options) {
            options = options ? Object.assign({}, options, object[$info].options) : object[$info].options;
        }
        return object[$info].inspect(object, options);
    }
    return util_1.inspect(object, options);
}
function stringify_object(object) {
    if (object[$info] && object[$info].stringify)
        return object[$info].stringify(object);
    return util_1.format(object);
}
function run_expression(parse, context, expr, options) {
    REX_SCAPED.lastIndex = 0;
    expr = '(' + expr.substr(1, expr.length - 2).replace(REX_SCAPED, PH_CHAR) + ')';
    try {
        var val = vm_1.runInContext(expr, context);
        return parse(val, options);
    }
    catch (err) {
        return "#ERROR:" + err.message + "#";
    }
}
function take_args(args) {
    var out = {
        args: args
    };
    if (args.length) {
        if (typeof args[0] === 'string') {
            out.message = args.shift();
        }
        else {
            if (args[0][$context]) {
                out.context = args.shift();
            }
            else {
                out.options = args.shift();
                if (args.length && args[0][$context])
                    out.context = args.shift();
            }
            if (args.length && typeof args[0] === 'string')
                out.message = args.shift();
        }
    }
    return out;
}
var ReplacerStream = (function (_super) {
    __extends(ReplacerStream, _super);
    function ReplacerStream(context, parse, options) {
        var _this = _super.call(this) || this;
        if (options) {
            if (options === true)
                options = undefined;
            _this._parse = inspect_object;
        }
        else {
            _this._parse = stringify_object;
        }
        _this._context = context[$context] ? context : format.contextualize(context);
        _this._options = options;
        return _this;
    }
    ReplacerStream.prototype._transform = function (chunk, encoding, callback) {
        var parse;
        if (encoding === 'buffer')
            encoding = undefined;
        if (this._rest) {
            chunk = this._rest + chunk.toString(encoding);
            this._rest = '';
        }
        else {
            chunk = chunk.toString(encoding);
        }
        var m;
        var from = 0;
        var out = '';
        REX_STREAM.lastIndex = 0;
        while ((m = REX_STREAM.exec(chunk)) != null) {
            if (m.index > from)
                out += chunk.substr(from, m.index - from);
            if (m[4]) {
                this._rest = m[0];
                from = chunk.length;
                break;
            }
            out += run_expression(this._parse, this._context, m[0], this._options);
            from = m.index + m[0].length;
        }
        if (from < chunk.length)
            out += chunk.substr(from);
        this.push(out);
        callback();
    };
    return ReplacerStream;
}(stream_1.Transform));
function format() {
    var argv = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        argv[_i] = arguments[_i];
    }
    var _a = take_args(argv), context = _a.context, message = _a.message, options = _a.options, args = _a.args;
    var parse;
    var ac = 0;
    if (options) {
        if (options === true)
            options = undefined;
        parse = inspect_object;
    }
    else {
        parse = stringify_object;
    }
    if (message) {
        if (context) {
            REX_STRING.lastIndex = 0;
            message = message.replace(REX_STRING, function (m) {
                if (m === SCAPED || m === UNNAMED)
                    return m;
                return run_expression(parse, context, m, options);
            });
        }
        message = message.replace(REX_UNNAMED, function (m) {
            if (m === SCAPED)
                return PH_CHAR;
            if (ac < args.length) {
                var val = args[ac++];
                return val === undefined ? '#UNDEFINED' : parse(val, options);
            }
        });
    }
    else {
        message = '';
    }
    if (ac < args.length) {
        if (message)
            message += ' ';
        message += parse(args[ac++], options);
        for (var i = ac; i < args.length; i++)
            message += ' ' + parse(args[i], options);
    }
    return message;
}
(function (format) {
    function customizeInspection(Class, info) {
        var proto = Class.prototype;
        proto[$info] = proto[$info] || {};
        Object.assign(proto[$info], info);
    }
    format.customizeInspection = customizeInspection;
    function contextualize(object) {
        if (object[$context])
            return object;
        object[$context] = true;
        return vm_1.createContext(object);
    }
    format.contextualize = contextualize;
    function isContextualize(object) {
        return object[$context];
    }
    format.isContextualize = isContextualize;
    function transform(context, options) {
        var parse;
        if (options) {
            if (options === true)
                options = undefined;
            parse = inspect_object;
        }
        else {
            parse = stringify_object;
        }
        if (!context[$context])
            context = contextualize(context);
        return new ReplacerStream(context, parse, options);
    }
    format.transform = transform;
})(format || (format = {}));
exports.default = format;
//# sourceMappingURL=index.js.map
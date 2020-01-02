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
var _rex_scaped;
var _rex_string;
var _rex_stream;
var _rex_unamed;
var _scaped_string;
var _unnamed;
var _mark;
function config_expressions(mark) {
    _mark = mark;
    _unnamed = mark + mark;
    _scaped_string = '\\' + mark;
    var SCAPED = '\\\\' + mark;
    var CONTENT = '([\\s' + chars_range(mark) + ']|(?<=\\\\)' + mark + ')+';
    var CONTENT_STRING = mark + '(' + CONTENT + ')' + mark;
    var CONTENT_STREAM = '(' + CONTENT_STRING + ')|(' + mark + '(' + CONTENT + ')*$)';
    var STRING_PATTERN = "(" + SCAPED + ')|(' + _unnamed + ')|(' + CONTENT_STRING + ')';
    var STREAM_PATTERN = "(" + SCAPED + ')|(' + CONTENT_STREAM + ')';
    var UNNAMED_PATTERN = SCAPED + '|' + _unnamed;
    _rex_scaped = new RegExp(SCAPED, 'g');
    _rex_string = new RegExp(STRING_PATTERN, 'g');
    _rex_stream = new RegExp(STREAM_PATTERN, 'g');
    _rex_unamed = new RegExp(UNNAMED_PATTERN, 'g');
}
function chars_range(char) {
    var code = char.charCodeAt(0);
    var a = (code - 1).toString(16).padStart(4, '0');
    var b = (code + 1).toString(16).padStart(4, '0');
    return "\\u0021-\\u" + a + "\\u" + b + "-\\uffff";
}
config_expressions('#');
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
    _rex_scaped.lastIndex = 0;
    expr = '(' + expr.substr(1, expr.length - 2).replace(_rex_scaped, _mark) + ')';
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
        _rex_stream.lastIndex = 0;
        while ((m = _rex_stream.exec(chunk)) != null) {
            if (m.index > from)
                out += chunk.substr(from, m.index - from);
            if (m[6]) {
                this._rest = m[0];
                from = chunk.length;
                break;
            }
            if (m[0] === _scaped_string) {
                out += _mark;
            }
            else {
                out += run_expression(this._parse, this._context, m[0], this._options);
            }
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
            _rex_string.lastIndex = 0;
            message = message.replace(_rex_string, function (m) {
                if (m === _scaped_string || m === _unnamed)
                    return m;
                return run_expression(parse, context, m, options);
            });
        }
        message = message.replace(_rex_unamed, function (m) {
            if (m === _scaped_string)
                return _mark;
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
    function changeMarkChar(mark) {
        config_expressions(mark);
    }
    format.changeMarkChar = changeMarkChar;
})(format || (format = {}));
exports.default = format;
//# sourceMappingURL=index.js.map
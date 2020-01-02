/// <reference types="node" />
import { InspectOptions } from 'util';
import { Transform } from "stream";
declare const $context: unique symbol;
declare type TObjectConstructor = {
    prototype: object;
};
declare type TInspectInfo = {
    inspect?: (object: any, options?: InspectOptions) => string;
    stringify?: (object: any) => string;
    options?: InspectOptions;
};
declare type TSandbox = {
    [$context]?: true;
    [key: string]: any;
};
declare type TContext = {
    [$context]: true;
    [key: string]: any;
};
declare function format(options: InspectOptions | boolean, context: TContext, message: string, ...args: any[]): string;
declare function format(options: InspectOptions | boolean, context: TContext, ...args: any[]): string;
declare function format(context: TContext, message: string, ...args: any[]): string;
declare function format(context: TContext, ...args: any[]): string;
declare function format(options: InspectOptions | boolean, message?: string, ...args: any[]): string;
declare function format(options: InspectOptions | boolean, ...args: any[]): string;
declare function format(message: string, ...args: any[]): string;
declare namespace format {
    function customizeInspection(Class: TObjectConstructor, info: TInspectInfo): void;
    function contextualize(object: TSandbox): TContext;
    function isContextualize(object: any): boolean;
    function transform(context: TSandbox | TContext, options?: InspectOptions | boolean): Transform;
    function changeMarkChar(mark: string): void;
    type Context = TContext;
    type Sandbox = TSandbox;
}
export default format;

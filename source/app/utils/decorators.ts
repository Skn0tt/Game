import 'reflect-metadata';
import onChange from "on-change";
import { merge, isObject } from 'lodash';
import { Binding } from "~bdo/lib/Binding";
import { ucFirst, pascalCase2kebabCase } from "~bdo/utils/util";
import { isBrowser } from "~bdo/utils/environment";
import { ReturnTypeFunc, AdvancedOptions } from "type-graphql/dist/decorators/types";
import { ObjectOptions } from "type-graphql/dist/decorators/ObjectType";
import {
    Field,
    ObjectType,
    Query,
    Arg,
    Args,
    Resolver,
    Root,
    Subscription,
    Mutation,
    PubSub,
    InputType
} from "type-graphql";

interface IWatchParams {
    /**
     * The name of the function which should be called when the value will be initialized.
     * Gets a parameter with initial value.
     *
     * @type {string}
     * @memberof IWatchParams
     */
    onInit?: string;

    /**
     * The name of the function which should be called when the value will be changed
     * Gets a parameter with new value and if it is an object or array it gets
     * additionally a parameter with the path which was changed.
     *
     * @type {string}
     * @memberof IWatchParams
     */
    onChange?: string;

    /**
     * The name of the function which should be called when a value will be added to the array.
     * Gets a parameter with the added value and the path.
     *
     * @type {string}
     * @memberof IWatchParams
     */
    onAdd?: string;

    /**
     * The name of the function which should be called when a value will be removed from the array.
     * Gets a parameter with the removed value and the path.
     *
     * @type {string}
     * @memberof IWatchParams
     */
    onRemove?: string;

    /**
     * If true arrays and object will recursively observed for
     * changes, removes and additions.
     *
     * @default false No recursive observation
     * @type {boolean}
     * @memberof IWatchParams
     */
    isShallow?: boolean;
}

/**
 * This parameters should only be used in models and components other objects
 * should not be effected with this behavior.
 *
 * @interface IPropertyParams
 */
interface IPropertyParams {
    /**
     * If set > 0 the value will expire after x milliseconds
     *
     * @default 0 Means will stored permanently
     * @type {number}
     */
    storeTemporary?: number;

    /**
     * If true the value will be saved in localStorage until its deletion
     * in localStorage or in redis until its deletion in redis.
     * This is useful to relieve heavy databases.
     *
     * @default false Values will NOT be saved in cache
     * @type {boolean}
     */
    saveInCache?: boolean;
}

/**
 * This parameters will only ba make sense when used in a model.
 * A Component or other objects will not be effected.
 *
 * @interface IAttributeParams
 */
interface IAttributeParams extends AdvancedOptions, IPropertyParams {
    /**
     * If true the value will not be sent to server if value is set
     * or save() will be called.
     *
     * @default false
     * @type {boolean}
     * @memberof IAttributeParams
     */
    noServerInteraction?: boolean;

    /**
     * If true the value will not be sent to client if value is set
     * or save() will be called.
     *
     * @default false
     * @type {boolean}
     * @memberof IAttributeParams
     */
    noClientInteraction?: boolean;

    /**
     * If true the value will not be sent to p2p clients of current client if
     * value is set or save() will be called.
     *
     * @default false
     * @type {boolean}
     * @memberof IAttributeParams
     */
    noP2PInteraction?: boolean;

    /**
     * @inheritdoc
     *
     * @default true Values will be saved in cache if is model else false
     * @type {boolean}
     * @memberof IAttributeParams
     */
    saveInCache?: boolean;

    /**
     * If true, value will be saved automatically and immediately.
     * If it is a number > 0 the value will be saved automatically but
     * debounced which means that the number is the time in milliseconds of
     * save timeout.
     *
     * @default false
     * @type {(boolean | number)}
     * @memberof IAttributeParams
     */
    autoSave?: boolean | number;
}

type FuncOrAttrParams = ReturnTypeFunc | IAttributeParams;
type nameOrOptsOrIndex = string | ObjectOptions | number;
type optsOrIndex = ObjectOptions | number;

/**
 * reacts on several types of changes of the property / attribute.
 * If no function name is given, it will look for on<PropertyName><Action>.
 *
 * Example: The property is named test and is of type string, then the
 * reactionFunction is called onTestChange.
 *
 * @export
 * @param {IndexStructure} params
 * @returns {PropertyDecorator}
 */
export function watched(params: IWatchParams = {}): PropertyDecorator {
    return (target: any, key: string | symbol | number) => {
        const propDesc = Reflect.getOwnPropertyDescriptor(target, key);

        // Create new property with getter and setter
        Reflect.deleteProperty(target, key);
        Reflect.defineProperty(target, key, {
            get: function get() {
                if (propDesc && propDesc.get) {
                    return propDesc.get.call(this);
                } else return Reflect.getMetadata(key, this);
            },
            set: function set(newVal: any) {
                const stringKey = key.toString();
                const capitalizedProp = ucFirst(stringKey);
                const that: IndexStructure = this;

                const initFunc = params.onInit || `on${capitalizedProp}Init`;
                const changeFunc = params.onChange || `on${capitalizedProp}Change`;
                const addFunc = params.onAdd || `on${capitalizedProp}Add`;
                const removeFunc = params.onRemove || `on${capitalizedProp}Remove`;

                // Observe objects and arrays of any changes
                if (newVal instanceof Array || isObject(newVal)) {
                    newVal = onChange(<IndexStructure>newVal, (path, value, previousValue) => {
                        const newObjectKeys = Object.keys(<object>value);
                        const oldObjectKeys = Object.keys(<object>previousValue);
                        const newLength = newObjectKeys.length;
                        const oldLength = oldObjectKeys.length;

                        // Case: added
                        if (newLength > oldLength && addFunc in this) {
                            for (const added of newObjectKeys) {
                                if (!oldObjectKeys.includes(added)) {
                                    that[addFunc]((<IndexStructure>value)[<any>added], path);
                                    break;
                                }
                            }
                        }

                        // Case: removed
                        if (newLength < oldLength && removeFunc in this) {
                            for (const removed of oldObjectKeys) {
                                if (!newObjectKeys.includes(removed)) {
                                    that[removeFunc]((<IndexStructure>previousValue)[<any>removed], path);
                                    break;
                                }
                            }
                        }

                        // Case: deep change
                        if (newLength === oldLength && changeFunc in this) {
                            if (Reflect.getMetadata(`init${capitalizedProp}`, this)) that[changeFunc](value, path);
                        }

                    }, { isShallow: Boolean(params.isShallow) });
                }

                // Only execute watching on changes reference types like array
                // will not be effected by this constraint.
                if (newVal === (<IndexStructure>this)[stringKey]) return;
                // Call other property descriptors on binding initializer else set metadata
                if (propDesc && propDesc.set) {
                    propDesc.set.call(this, newVal);
                } else Reflect.defineMetadata(key, newVal, this);

                // React on initial variable changes
                if (changeFunc in this && Reflect.getMetadata(`init${capitalizedProp}`, this)) that[changeFunc]();
                if (initFunc in this && !Reflect.getMetadata(`init${capitalizedProp}`, this)) that[initFunc](newVal);
                Reflect.defineMetadata(`init${capitalizedProp}`, true, this);
            },
            enumerable: true,
            configurable: true
        });
    };
}

/**
 * Marks an component property as a real property and avoids setting the
 * corresponding attribute. Also it maintains the "properties" values of a
 * component.
 *
 * @export
 * @returns {PropertyDecorator}
 */
export function property(params: IPropertyParams = {}): PropertyDecorator {
    return (target: any, key: string | symbol) => {
        // Get previous defined property descriptor for chaining
        const propDesc = Reflect.getOwnPropertyDescriptor(target, key);

        // Define metadata for access to properties like this.attributes
        if (!Reflect.hasMetadata("definedProperties", target)) {
            Reflect.defineMetadata("definedProperties", new Array<string>(), target);
        }
        const propertyMap: string[] = Reflect.getMetadata("definedProperties", target);
        propertyMap.push(key.toString());

        // Define new metadata property
        Reflect.deleteProperty(target, key);
        Reflect.defineProperty(target, key, {
            get: function get() {
                if (propDesc && propDesc.get) {
                    return propDesc.get.call(this);
                } else {
                    if (params.saveInCache) return getCache(this, key);
                    return Reflect.getMetadata(key, this);
                }
            },
            set: function set(newVal: any) {
                if (newVal === (<IndexStructure>this)[key.toString()]) return;
                newVal = processBinding(this, key, newVal, propDesc);
                setUpdateCache(this, key, newVal, params);
            },
            enumerable: true,
            configurable: true
        });
    };
}

/**
 * Marks a component property as a real attribute and reflects the set values
 * to the attribute dom even it is not a native attribute.
 *
 * If it is a BDOModel it marks the property as an attribute which should be
 * send to server or saved in database.
 *
 * It also do some other logic like data flow, caching and so on. For more
 * information read the property comments.
 *
 * @export
 * @returns {PropertyDecorator}
 */
export function attribute(typeFunc?: FuncOrAttrParams, params?: IAttributeParams): PropertyDecorator {
    return (target: any, key: string | symbol) => {
        if (typeFunc && !(typeFunc instanceof Function) && !params) params = typeFunc;
        if (!params) params = {};

        if (params.saveInCache === undefined && "isBDOModel" in target) params.saveInCache = true;

        // Decide which Field should be used
        if (typeFunc instanceof Function && params) Field(typeFunc, params)(target, key);
        else if (typeFunc instanceof Function) Field(typeFunc)(target, key);
        else if (params) Field(params)(target, key);
        else Field()(target, key);

        // Get previous defined property descriptor for chaining
        const propDesc = Reflect.getOwnPropertyDescriptor(target, key);

        // Define new metadata property
        Reflect.deleteProperty(target, key);
        Reflect.defineProperty(target, key, {
            get: function get() {
                if (propDesc && propDesc.get) {
                    return propDesc.get.call(this);
                } else {
                    if (params && params.saveInCache) return getCache(this, key);
                    return Reflect.getMetadata(key, this);
                }
            },
            set: function set(newVal: any) {
                const stringKey = key.toString();
                if (newVal === (<IndexStructure>this)[stringKey]) return;
                const initMetaName = `${stringKey}AttrInitialized`;
                newVal = processBinding(this, key, newVal, propDesc);
                setUpdateCache(this, key, newVal, params);
                // Prefer in DOM defined attributes on initialization
                if (isBrowser() && this instanceof HTMLElement) {
                    const attrValue = this.getAttribute(stringKey);
                    if (!Reflect.getMetadata(initMetaName, this) && attrValue) {
                        // Mark as initialized to prevent static attribute
                        Reflect.defineMetadata(initMetaName, true, this);
                        Reflect.set(this, stringKey, attrValue);
                        // Set the real value and redo setter
                        (<IndexStructure>this)[key.toString()] = attrValue;
                        return;
                    } else Reflect.defineMetadata(initMetaName, true, this);
                    // Reflect property changes to attribute
                    if (attrValue !== newVal) this.setAttribute(stringKey, newVal);
                }
            },
            enumerable: true,
            configurable: true
        });
    };
}

/**
 * Constructs an object with its constParams with position constParamsIndex.
 * It also defines an graphQL object type if it is a BDOModel
 *
 * @export
 * @param {number} [constParamsIndex=0] Position of parameters which are used to initialize the object
 * @returns
 */
export function baseConstructor(name?: nameOrOptsOrIndex, options?: optsOrIndex, constParamsIndex: number = 0) {

    return (ctor: any) => {
        const prototype = Object.getPrototypeOf(ctor);
        if (prototype.name === "BaseConstructor") {
            Object.setPrototypeOf(ctor, Object.getPrototypeOf(prototype));
        }

        // Determine param types
        if (name && (typeof name === "number")) constParamsIndex = name;
        if (name && (typeof name === "object")) options = name;
        if (name && ((typeof name === "object") || (typeof name === "number"))) name = undefined;
        if (options && (typeof options === "number")) constParamsIndex = options;
        if (options && (typeof options === "number")) options = undefined;

        if ("isBDOModel" in ctor) {
            // Decide which ObjectType to use
            if (name && (typeof name === "string") && options && (typeof options === "object")) {
                ObjectType(name, options)(ctor);
            } else if (name && (typeof name === "string")) {
                ObjectType(name)(ctor);
            } else if (options && (typeof options === "object")) {
                ObjectType(options)(ctor);
            } else ObjectType()(ctor);
        }

        if (options && (typeof options === "object" && options.isAbstract)) return ctor;

        /**
         * Invokes the life cycle of every component and model
         *
         * @class BaseConstructor
         * @extends {ctor}
         */
        class BaseConstructor extends ctor {

            /**
             * Determines the original type of this model - set by the
             * baseConstructor - for the GraphQL resolver
             *
             * @static
             */
            public static readonly graphQLType: any = ctor;

            constructor(...params: any[]) {
                super(...params);
                let constParams = params[constParamsIndex];
                if (!(constParams instanceof Object)) constParams = {};
                merge(this, constParams);
                if ("constructedCallback" in this) (<any>this).constructedCallback(...params);
            }
        }
        if (isBrowser() && ctor.isBaseComponent) {
            customElements.define(pascalCase2kebabCase(ctor.name), BaseConstructor, {
                extends: BaseConstructor.extends
            });
        }
        return BaseConstructor;
    };
}

export let query = Query;
export let arg = Arg;
export let args = Args;
export let resolver = Resolver;
export let root = Root;
export let mutation = Mutation;
export let subscription = Subscription;
export let pubSub = PubSub;
export let inputType = InputType;

/**
 * Does the second part of the binding mechanism.
 * First part is to initialize the Binding object.
 * Second part is to bind the components/models to each other
 *
 * @param {*} thisArg The object on which the binding is working on
 * @param {(string | number | symbol)} key The property name
 * @param {*} newVal The new value of the property
 * @param {PropertyDescriptor} [propDesc] The original property descriptor
 * @returns {*} The value of the binding
 */
function processBinding(thisArg: any, key: string | symbol | number, newVal: any, propDesc?: PropertyDescriptor): any {
    let reflect = true;

    // Create new property descriptor on bound object if it is bound
    if (newVal instanceof Binding) {
        // Bind to thisArg object
        newVal.install(thisArg, key);
        reflect = false;
        newVal = newVal.valueOf();
    }

    const initiatorMData: Map<string, Binding<any, any>> | undefined = Reflect.getMetadata("initiatorBinding", thisArg);
    const initiatorBinding = initiatorMData ? initiatorMData.get(key.toString()) : undefined;

    // Only execute watching on changes
    if (newVal === thisArg[key]) return newVal;
    // Call other property descriptors on binding initializer else set metadata
    if (propDesc && propDesc.set) {
        propDesc.set.call(thisArg, newVal);
    } else Reflect.defineMetadata(key, newVal, thisArg);

    if (reflect && initiatorBinding) initiatorBinding.reflectToObject(newVal);
    return newVal;
}

/**
 * sets or updates cache from attributes or properties respecting the
 * "storeTemporary" parameter.
 *
 * @param {*} instance
 * @param {(string | symbol)} key
 * @param {IAttributeParams} params
 */
function setUpdateCache(instance: any, key: string | symbol, newVal: any, params?: IAttributeParams) {
    const objectType = Object.getPrototypeOf(instance.constructor).name;
    let cacheId = `${objectType}_${Reflect.getMetadata("oldID", instance)}`;

    let cacheValue: any;
    if (key === "id") {
        const newCacheId = `${objectType}_${newVal}`;
        cacheValue = localStorage.getItem(cacheId);
        if (cacheValue) {
            localStorage.removeItem(cacheId);
            localStorage.setItem(newCacheId, cacheValue);
        }
        cacheId = newCacheId;
    }
    Reflect.defineMetadata("oldID", instance.id, instance);
    if (params && params.saveInCache) {
        cacheValue = cacheValue || localStorage.getItem(cacheId);
        if (cacheValue) {
            cacheValue = JSON.parse(cacheValue);
        } else cacheValue = {};
        localStorage.setItem(cacheId, JSON.stringify(Object.assign(cacheValue, {
            [key]: {
                value: newVal,
                expires: params.storeTemporary ? Date.now() + params.storeTemporary : 0
            }
        })));
    }
}

/**
 * Test
 *
 * @template T
 * @template K
 * @param {T} instance
 * @param {K} key
 * @returns {T[K]}
 */
function getCache<T extends any, K extends string | symbol>(instance: T, key: K): T[K] {
    const objectType = Object.getPrototypeOf(instance.constructor).name;
    const cacheId = `${objectType}_${Reflect.getMetadata("oldID", instance)}`;
    let cacheValue: any = localStorage.getItem(cacheId);
    if (cacheValue) cacheValue = JSON.parse(cacheValue);
    if (cacheValue && key in cacheValue) {
        if (!cacheValue[key].expires || cacheValue[key].expires >= Date.now()) {
            return cacheValue[key].value;
        } else setUpdateCache(instance, key, undefined, { storeTemporary: 0, saveInCache: true });
    }
    return undefined;
}

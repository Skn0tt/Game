import { v1 as uuid } from "uuid";
import { ID } from "type-graphql";
import { Binding } from "~bdo/lib/Binding";
import { attribute, baseConstructor, property } from "~bdo/utils/decorators";

/**
 * Provides basic functionality and fields for each Model on each side
 * (server and client)
 *
 * @export
 * @abstract
 * @class BDOModel
 */
@baseConstructor({ isAbstract: true })
export abstract class BDOModel {

    /**
     * Determines the original type of this model - set by the
     * baseConstructor - for the GraphQL resolver
     *
     * @static
     * @type {*}
     * @memberof BDOModel
     */
    public static readonly graphQLType: any = Object.getPrototypeOf(BDOModel.constructor);

    /**
     * This is just a BDOModel identifier in case you want to know if a not
     * initialized class is a model.
     *
     * @static
     * @type {boolean}
     * @memberof BDOModel
     */
    public static readonly isBDOModel: boolean = true;

    /**
     * Provides a unique id for each model. If there is no id given, a unique
     * dummy id will be generated.
     *
     * @type {string}
     * @memberof BDOModel
     */
    @attribute((_type) => ID) public id: string = `pending_${uuid()}`;

    /**
     * Represents the constructors name to ensure the right Model construction
     * on client and server side when data is received.
     *
     * @protected
     * @type {string}
     * @memberof BDOModel
     */
    @attribute() public readonly className: string = Object.getPrototypeOf(this.constructor).name;

    /**
     * This is for better identification of BDO models and instance check
     *
     * @type {boolean}
     * @memberof BDOModel
     */
    @property() public readonly isBDOModel: boolean = true;

    /**
     * Holds a list of all bindings to all components
     *
     * @readonly
     * @protected
     * @type {Map<string, Array<Binding<this, DefinitiveNonFunctionPropertyNames<this>>>>}
     * @memberof BDOModel
     */
    protected get bindings(): Map<string, Array<Binding<this, DefinitiveNonFunctionPropertyNames<this>>>> {
        const bindings = Reflect.getMetadata("bindings", this);
        return bindings ? bindings : new Map();
    }

    /**
     * gets the property of this model and converts it to a watched one.
     * Only useful in combination with the watched decorator.
     *
     * @param {string} propName Name of the property which should be watched
     * @returns {*} The identity of the property as none primitive
     * @memberof BDOModel
     */
    public bind<K extends Exclude<NonFunctionPropertyNames<this>, undefined>>(propName: K) {
        return new Binding(this, propName) as unknown as this[K];
    }
}

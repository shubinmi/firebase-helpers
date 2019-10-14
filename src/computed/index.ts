export interface ComputedProperties {
    [key: string]: any;
}

export interface MapScheme {
    [from: string]: string;
}

export class Computed {
    get ioMap(): MapScheme {
        if (this._ioMap && Object.keys(this._ioMap).length) {
            return this._ioMap;
        }
        this.ioMap = this.defaultMapSchema();
        return this._ioMap;
    }

    set ioMap(value: MapScheme) {
        this._ioMap = value;
    }

    protected _ioMap: MapScheme = {};

    set validator(value: (d: object) => boolean) {
        this._validator = value;
    }

    protected _validator?: (d: object) => boolean = undefined;

    protected defaultMapSchema(): MapScheme {
        const map: MapScheme = {};
        Object.getOwnPropertyNames(this)
            .forEach((k: string) => {
                if (Object.getOwnPropertyNames(new Computed()).includes(k)) {
                    return;
                }
                map[k] = k;
            });
        return map;
    }

    public validate(): boolean {
        return !this._validator || this._validator(this);
    }

    public input(data: ComputedProperties): this {
        const result: ComputedProperties = {};
        Object.getOwnPropertyNames(this.ioMap).forEach(k => {
            if (data[k] === undefined) {
                return;
            }
            result[this.ioMap[k]] = data[k];
        });
        this.setProps({...data, ...result});
        return this;
    }

    public output(): ComputedProperties {
        const result: ComputedProperties = {};
        const map: MapScheme = {...this.defaultMapSchema(), ...this.ioMap};
        Object.getOwnPropertyNames(map)
            .forEach(k => {
                result[k] = this.getProp(map[k]);
            });
        return filterUndefinedComputed(result);
    }

    public setProps(ps: ComputedProperties): this {
        hydrate(this, ps);
        return this;
    }

    public toObject(filerEmpty: boolean = false): ComputedProperties {
        return filterUndefinedComputed(
            extract(
                this,
                filerEmpty,
                Object.getOwnPropertyNames(new Computed())
            )
        );
    }

    public getProp(propName: string) {
        try {
            return getProp(this, propName);
        } catch (e) {
            return null;
        }
    }
}

export function hydrate(obj: ComputedProperties, params: any): void {
    Object.getOwnPropertyNames(obj).forEach(
        (prop: string) => {
            Object.getOwnPropertyNames(params).forEach(
                (key: string) => {
                    let searchKey = key;
                    let searchProp = prop;
                    [' ', '_', '-'].forEach(
                        (rep: string) => {
                            searchKey = searchKey.replace(rep, '');
                            searchProp = searchProp.replace(rep, '');
                        },
                    );
                    if (searchKey.toLowerCase() === searchProp.toLowerCase()) {
                        Reflect.set(obj, prop, params[key]);
                    }
                });
        });
}

export function extract(obj: ComputedProperties, filerEmpty: boolean = false, exclude?: string[]): ComputedProperties {
    const result: ComputedProperties = {};
    Object.getOwnPropertyNames(obj).forEach(
        (prop: string) => {
            let newProp = prop;
            [' ', '_', '-'].forEach(
                (rep: string) => {
                    newProp = newProp.replace(rep, '');
                },
            );
            if (exclude && exclude.includes(prop)) {
                return;
            }
            if (filerEmpty && Reflect.get(obj, prop) === undefined) {
                return;
            }
            result[newProp] = Reflect.get(obj, prop);
        },
    );
    return result;
}
export function setProps<T>(obj: T, newData: any): T {
    Object.getOwnPropertyNames(newData).forEach((prop: string) => {
        (obj as any)[prop] = newData[prop];
    });
    return obj;
}
export function getProp<O extends Record<K, any>, K extends keyof any>(obj: O, prop: K): O[K];

export function getProp<K extends keyof any>(key: K): <O extends Record<K, any>>(obj: O) => O[K];

export function getProp(a: any, b?: any): any {
    return b ? a[b] : (obj: any) => obj[a];
}

export function buildComputed<T extends Computed>(
    objClass: { new(): T },
    ps?: ComputedProperties,
    validator?: (d: object) => boolean,
    map?: MapScheme): T {
    const obj = new objClass();
    if (map) {
        obj.ioMap = map;
    }
    if (validator) {
        obj.validator = validator;
    }
    if (ps) {
        obj.input(ps);
    }
    return obj;
}

export function diff(base: ComputedProperties, minus: ComputedProperties): ComputedProperties {
    const bP = Object.getOwnPropertyNames(base);
    const mP = Object.getOwnPropertyNames(minus);
    const dif: ComputedProperties = {};
    for (const prop of bP) {
        if (mP.includes(prop)) {
            continue;
        }
        dif[prop] = base[prop];
    }
    return dif;
}

export function filterUndefinedComputed(obj: ComputedProperties): ComputedProperties {
    const result: ComputedProperties = {};
    Object.getOwnPropertyNames(obj).forEach(
        (prop: string) => {
            const v = Reflect.get(obj, prop);
            if (v === undefined) {
                return;
            }
            if (v === 'undefined') {
                return;
            }
            result[prop] = v;
        },
    );
    return result;
}

export function filterEmptyComputed(obj: ComputedProperties): ComputedProperties {
    const result: ComputedProperties = {};
    Object.getOwnPropertyNames(obj).forEach(
        (prop: string) => {
            const v = Reflect.get(obj, prop);
            if (v === undefined) {
                return;
            }
            if (v === null) {
                return;
            }
            result[prop] = v;
        },
    );
    return result;
}

export function setToAllEmptyFields(obj: ComputedProperties, value: any): ComputedProperties {
    const result: ComputedProperties = {};
    Object.getOwnPropertyNames(obj).forEach(
        (prop: string) => {
            const v = Reflect.get(obj, prop);
            if (v === undefined || v === null) {
                result[prop] = value;
                return;
            }
            result[prop] = v;
        },
    );
    return result;
}

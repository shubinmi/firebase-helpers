import * as express from "express";
import {getAllParams} from "../rest/params";
import {
    buildComputed,
    Computed,
    ComputedProperties,
    diff,
    filterEmptyComputed,
    setToAllEmptyFields
} from "../computed";
import {SearchMeta} from "../rest/search-meta";
import {app, firestore} from "firebase-admin";
import {BadRequestError, PrioritizedHandler, RestBehaviorManager} from "../rest/rest-behavior-manager";

export default class FirestoreCrud {

    get rbMng(): RestBehaviorManager {
        return this._rbMng;
    }

    get fbApp(): app.App {
        return this._fbApp;
    }

    private _fbApp: app.App;

    private _rbMng: RestBehaviorManager;

    constructor(fbApp: app.App, rbMng: RestBehaviorManager) {
        this._fbApp = fbApp;
        this._rbMng = rbMng;
    }

    public find(): express.RequestHandler {
        const me = this;
        return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
            try {
                const entity = req.params.entity;
                const id = req.params.id;
                if (!entity) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `entity`');
                }
                const data: object[] = [];
                const col = RestBehaviorManager.pathToCollection(entity);
                if (!id) {
                    const p = getAllParams(req);
                    const meta = buildComputed(SearchMeta, p);
                    let search = diff(p, {...meta.toObject(), entity: 'entity', id: 'id'});
                    search = FirestoreCrud.inputDataWithCtx(search, req);
                    search = filterEmptyComputed(search);
                    let q = me.fbApp.firestore()
                        .collection(col)
                        .limit(meta.limit || 100);
                    if (meta.orderBy) {
                        q = q.orderBy(meta.orderBy);
                    }
                    if (meta.start) {
                        q = q.startAt(meta.start);
                    }
                    Object.keys(search).forEach((k: string) => {
                        // noinspection TypeScriptValidateJSTypes
                        q = q.where(k, '==', search[k]);
                    });
                    const snapshot: firestore.QuerySnapshot = await q.get();
                    if (snapshot.empty) {
                        res.status(404).json([]);
                        next();
                        return;
                    }
                    snapshot.forEach(d => {
                        const output = FirestoreCrud.outputDataWithCtx(d.data(), req);
                        data.push({id: d.id, ...output});
                    });
                } else {
                    const docData = await me.findOne(col, id);
                    if (docData !== null) {
                        data.push(docData);
                    } else {
                        res.status(404).json([]);
                        next();
                        return;
                    }
                }
                res.status(200).json(data);
                next();
            } catch (e) {
                next(e);
                return;
            }
        }
    };

    public upsert(): express.RequestHandler {
        const me = this;
        return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
            try {
                const entity = req.params.entity;
                if (!entity) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `entity`');
                }
                const col = RestBehaviorManager.pathToCollection(entity);
                const p = getAllParams(req);
                const meta = buildComputed(SearchMeta, p);
                const id = p.id || undefined;
                let data = diff(p, {...meta.toObject(), entity: 'entity', id: 'id'});
                data = FirestoreCrud.inputDataWithCtx(data, req);
                let status = 201;
                let fsObj: firestore.DocumentReference;
                if (!id) {
                    fsObj = await me.fbApp.firestore().collection(col).add(data);
                } else if (await me.findOne(col, id) !== null) {
                    data = filterEmptyComputed(data);
                    fsObj = me.fbApp.firestore().collection(col).doc(id);
                    await fsObj.update(data);
                    status = 200;
                } else {
                    fsObj = me.fbApp.firestore().collection(col).doc(id);
                    await fsObj.set(data);
                }
                const doc = await fsObj.get();
                const output = FirestoreCrud.outputDataWithCtx(<any>doc.data(), req);
                res.status(status).json({...output, id: doc.id});
                next();
            } catch (e) {
                next(e);
                return;
            }
        }
    };

    public update(): express.RequestHandler {
        const me = this;
        return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
            try {
                const entity = req.params.entity;
                if (!entity) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `entity`');
                }
                // noinspection ExceptionCaughtLocallyJS
                const id = req.params.id;
                if (!id) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `id`');
                }
                const col = RestBehaviorManager.pathToCollection(entity);
                const p = getAllParams(req);
                const meta = buildComputed(SearchMeta, p);
                const prototype = me.rbMng.getEntityPrototype(entity);
                if (!prototype) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Bad entity name. Add this entity to rest CRUD.');
                }
                let data = diff({...prototype.toObject(), ...p}, {
                    ...meta.toObject(),
                    entity: 'entity',
                    id: 'id'
                });
                data = FirestoreCrud.inputDataWithCtx(data, req);
                let fsObj: firestore.DocumentReference;
                if (await me.findOne(col, id) === null) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Resource doesn\'t exist');
                }
                data = setToAllEmptyFields(data, firestore.FieldValue.delete());
                fsObj = me.fbApp.firestore().collection(col).doc(id);
                await fsObj.update(data);
                const doc = await fsObj.get();
                const output = FirestoreCrud.outputDataWithCtx(<any>doc.data(), req);
                res.status(200).json({...output, id: doc.id});
                next();
            } catch (e) {
                next(e);
                return;
            }
        }
    };

    public patch(): express.RequestHandler {
        const me = this;
        return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
            try {
                const entity = req.params.entity;
                if (!entity) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `entity`');
                }
                // noinspection ExceptionCaughtLocallyJS
                const id = req.params.id;
                if (!id) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `id`');
                }
                const col = RestBehaviorManager.pathToCollection(entity);
                const p = getAllParams(req);
                const meta = buildComputed(SearchMeta, p);
                let data = diff(p, {...meta.toObject(), entity: 'entity', id: 'id'});
                let fsObj: firestore.DocumentReference;
                if (await me.findOne(col, id) === null) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Resource doesn\'t exist');
                }
                data = filterEmptyComputed(data);
                fsObj = me.fbApp.firestore().collection(col).doc(id);
                await fsObj.update(data);
                const doc = await fsObj.get();
                const output = FirestoreCrud.outputDataWithCtx(<any>doc.data(), req);
                res.status(200).json({id: doc.id, ...output});
                next();
            } catch (e) {
                next(e);
                return;
            }
        }
    };

    public delete(): express.RequestHandler {
        const me = this;
        return async function (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
            try {
                const entity = req.params.entity;
                if (!entity) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `entity`');
                }
                // noinspection ExceptionCaughtLocallyJS
                const id = req.params.id;
                if (!id) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new BadRequestError('Empty required part of path `id`');
                }
                const col = RestBehaviorManager.pathToCollection(entity);
                await me.fbApp.firestore().collection(col).doc(id).delete();
                res.status(204).json();
                next();
            } catch (e) {
                next(e);
                return;
            }
        }
    };

    public attachEntity(entity: Computed): this {
        this.rbMng
            .addEntity(entity)
            .attachRules(entity, ['get'], [new PrioritizedHandler(this.find(), 100)])
            .attachRules(entity, ['post'], [new PrioritizedHandler(this.upsert(), 100)])
            .attachRules(entity, ['put'], [new PrioritizedHandler(this.update(), 100)])
            .attachRules(entity, ['patch'], [new PrioritizedHandler(this.patch(), 100)])
            .attachRules(entity, ['delete'], [new PrioritizedHandler(this.delete(), 100)]);
        return this;
    }

    private static outputDataWithCtx(data: ComputedProperties, req: express.Request): ComputedProperties {
        const prototypeSource: Computed = req.app.get(req.params.entity.toLowerCase());
        // noinspection SuspiciousTypeOfGuard
        if (!(prototypeSource instanceof Computed)) {
            return data;
        }
        const prototypeTarget: Computed = Object.create(prototypeSource);
        Object.assign(prototypeTarget, prototypeSource);
        prototypeTarget.setProps(data);
        if (!prototypeTarget.validate()) {
            // noinspection ExceptionCaughtLocallyJS
            throw new BadRequestError('Invalid params.');
        }
        return prototypeTarget.output();
    }

    private static inputDataWithCtx(data: ComputedProperties, req: express.Request): ComputedProperties {
        const prototypeSource: Computed = req.app.get(req.params.entity.toLowerCase());
        // noinspection SuspiciousTypeOfGuard
        if (!(prototypeSource instanceof Computed)) {
            return data;
        }
        const prototypeTarget: Computed = Object.create(prototypeSource);
        Object.assign(prototypeTarget, prototypeSource);
        prototypeTarget.input(data);
        if (!prototypeTarget.validate()) {
            // noinspection ExceptionCaughtLocallyJS
            throw new BadRequestError('Invalid params.');
        }
        return prototypeTarget.toObject();
    }

    private async findOne(col: string, id: string): Promise<ComputedProperties | null> {
        try {
            const doc: firestore.DocumentSnapshot = await this.fbApp.firestore()
                .collection(col)
                .doc(id)
                .get();
            if (!doc.exists) {
                return null;
            }
            return {id: doc.id, ...doc.data()};
        } catch (e) {
            return null;
        }
    };
}
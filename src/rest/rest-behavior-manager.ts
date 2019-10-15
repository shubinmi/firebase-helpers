import * as express from "express";
import Comp from "../computed/dto";

namespace RBM {
    export class RestBehaviorManager {
        private tree: RestRouterTree = {
            all: {}
        };

        private entityPrototypesMap: ComputedPrototypesMap = {};

        public static reqRoutPathPart = '/:entity/:id?';

        public requestHandler(): express.RequestHandler {
            const rbm = this;
            return async function (req: express.Request, res: express.Response, next: express.NextFunction) {
                let methodBehaviors: PrioritizedHandler[] = [];
                try {
                    methodBehaviors = rbm.tree[req.method.toLowerCase()][req.params.entity.toLowerCase()];
                } catch (e) {
                }
                req.app.set(req.params.entity.toLowerCase(), rbm.entityPrototypesMap[req.params.entity.toLowerCase()]);
                try {
                    const commonBehaviors = rbm.tree.all[req.params.entity];
                    const bs = methodBehaviors
                        .concat(commonBehaviors)
                        .sort((left, right) => left.priority > right.priority ? 1 : -1);
                    for (const b of bs) {
                        const di = {
                            success: false,
                            error: new Error('You miss call `next()` at the end of some your PrioritizedHandler')
                        };
                        const callback = function (err?: Error) {
                            if (err) {
                                di.error = err;
                                return;
                            }
                            di.success = true;
                        };
                        await b.handler(req, res, callback);
                        if (!di.success) {
                            // noinspection ExceptionCaughtLocallyJS
                            throw di.error;
                        }
                    }
                } catch (e) {
                    let status = 500;
                    if (e instanceof BadRequestError) {
                        status = 400;
                    }
                    if (status === 500) {
                        console.error(e);
                    }
                    res.status(status).json({error: e.message});
                    next();
                }
                next();
            }
        }

        public addEntity(entity: Comp.Computed): this {
            const path = RestBehaviorManager.classToPath(entity.constructor.name);
            if (this.tree.all.hasOwnProperty(path)) {
                throw Error('Path `' + path + '` already exist.')
            }
            this.entityPrototypesMap[path] = entity;
            this.tree.all[path] = [];
            return this;
        }

        public attachRules(cl: Comp.Computed, methods: RequestMethod[], handlers: PrioritizedHandler[]): this {
            try {
                for (const m of methods) {
                    handlers.forEach(h => this.addMiddleware(cl, m, h));
                }
            } catch (e) {
                throw e;
            }
            return this;
        }

        public addMiddleware(cl: Comp.Computed, method: RequestMethod, handler: PrioritizedHandler): this {
            const path = RestBehaviorManager.classToPath(cl.constructor.name);
            if (!this.tree[method]) {
                this.tree[method] = {};
            }
            if (!this.tree[method][path]) {
                this.tree[method][path] = [];
            }
            this.tree[method][path].push(handler);
            return this;
        }

        public getEntityPrototype(path: string): Comp.Computed | null {
            if (!this.entityPrototypesMap[path]) {
                return null;
            }
            const p = this.entityPrototypesMap[path];
            if (p ! instanceof Comp.Computed) {
                return null;
            }
            return Object.assign({}, p);
        }

        private static classToPath(cl: string): string {
            const clName = cl.charAt(0).toLowerCase() + cl.substr(1);
            try {
                return clName.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);
            } catch (e) {
                return clName;
            }
        }

        public static pathToCollection(path: string): string {
            return path.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        }
    }

    interface RestRouterTree {
        [method: string]: RestBehaviorTree;
    }

    interface RestBehaviorTree {
        [entity: string]: PrioritizedHandler[];
    }

    export class PrioritizedHandler {
        public handler: express.RequestHandler;
        public priority: number;

        constructor(handler: express.RequestHandler, priority: number = 10) {
            this.handler = handler;
            this.priority = priority;
        }
    }

    type RequestMethod = "post" | "get" | "put" | "delete" | "patch" | "all";

    export class BadRequestError extends Error {
    }

    interface ComputedPrototypesMap {
        [entity: string]: Comp.Computed,
    }
}

export default RBM;

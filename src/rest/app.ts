import * as express from 'express';

export default class App {

    public app: express.Application;

    constructor(...hs: express.RequestHandler[]) {
        this.app = express();
        this.config(hs);
    }

    private config(hs: express.RequestHandler[]): void {
        for (const h of hs) {
            this.app.use(h);
        }
    }

    public attachRoute(f: (a: express.Application) => void): this {
        f(this.app);
        return this;
    }

}

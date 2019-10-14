import * as express from "express";
import {filterUndefinedComputed} from "../computed";

export function getAllParams(req: express.Request) {
    return filterUndefinedComputed({...req.params, ...req.body, ...req.query});
}

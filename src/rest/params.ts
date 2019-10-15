import * as express from "express";
import Comp from "../computed/dto";

export default function getAllParams(req: express.Request) {
    return Comp.filterUndefinedComputed({...req.params, ...req.body, ...req.query});
}

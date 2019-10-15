import * as express from "express";
import dto from "../computed/dto";

export default function getAllParams(req: express.Request) {
    return dto.filterUndefinedComputed({...req.params, ...req.body, ...req.query});
}

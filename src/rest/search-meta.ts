import {Computed} from "../computed";

export class SearchMeta extends Computed {
    public orderBy?: string = undefined;
    public start?: any = undefined;
    public limit: number = 100;
}

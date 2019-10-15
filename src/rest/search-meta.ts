import Comp from "../computed/dto";

export default class SearchMeta extends Comp.Computed {
    public orderBy?: string = undefined;
    public start?: any = undefined;
    public limit: number = 100;
}

import dto from "../computed/dto";

export default class SearchMeta extends dto.Computed {
    public orderBy?: string = undefined;
    public start?: any = undefined;
    public limit: number = 100;
}

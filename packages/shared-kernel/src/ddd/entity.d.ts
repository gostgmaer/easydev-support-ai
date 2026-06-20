export declare abstract class Entity<T> {
    protected readonly _id: T;
    constructor(id: T);
    get id(): T;
    equals(object?: Entity<T>): boolean;
}

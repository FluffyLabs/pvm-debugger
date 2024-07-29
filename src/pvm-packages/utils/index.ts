/**
 * Utilities that are widely used across typeberry.
 *
 * BIG FAT NOTE: Please think twice or thrice before adding something here.
 * The package should really contain only things that are pretty much essential
 * and used everywhere.
 *
 * It might be much better to create a small package just for the thing you
 * are thinking about adding here. It's easier to later consolide smaller
 * things into this `utils` package than to split it into separate parts
 * as an afterthought.
 */

export * from "./debug";
export * from "./opaque";

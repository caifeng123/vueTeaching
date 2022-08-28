export const getType = (obj: any) =>
    Object.prototype.toString.call(obj).match(/(?<=\w+\s)\w+/g)[0];

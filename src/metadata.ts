const metadata = new WeakMap<any[]>();

export const setEffects = (model: any, data: any) => {
	metadata.set(model, data);
};

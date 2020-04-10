class Action<T> {
	payload: T;
}

// const reduce = <T>(
// 	prototype: Object,
// 	name: string | symbol,
// 	descriptor: TypedPropertyDescriptor<T>
// ) => {};

const decoTest = <P, S>() => (
	prototype: Object,
	name: string | symbol,
	descriptor: TypedPropertyDescriptor<(a: Action<P>) => S>
) => {};

type ReducerKeys<T, M extends {}> = {
	[K in keyof M]?: M[K] extends string ? K : never;
}[keyof M];

class Model<T> {
	public readonly state: T;
	public async setState(_: Partial<T>): Promise<void> {}
}

const reducer = <R extends string>(...reducers: R[]) => <
	T,
	M extends {
		new (...args: any[]): Model<T> &
			{ [K in R]: (state: T, action: Action<any>) => T };
	}
>(
	model: M
) => {};

interface IState {
	value: number;
}

export class Form extends Model<IState> {
	public increment(action: Action<string>) {
		return this.state.value + 1;
	}

	public decrement({ payload }: Action<number>) {
		return { value: this.state.value - payload };
	}
}

/* @ */ reducer('increment', 'decrement');
export class FormModel extends Model<IState> {
	public increment(state: IState, { payload }: Action<number>) {
		return state.value + payload;
	}

	public decrement(state: IState, { payload }: Action<number>) {
		return { value: state.value - payload };
	}
}

const Test = (p: string) => class {};

class TT extends Test('sdf') {}

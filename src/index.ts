const getStateSymbol = Symbol('getState');
const dispatchSymbol = Symbol('dispatch');
const subscribeSymbol = Symbol('subscribe');
const actionsEventEmitterSymbol = Symbol('actionsEe');
const initSymbol = Symbol('init');
const onDestroySymbol = Symbol('onDestroy');

type Unsubscribe = () => void;

export const BEFORE_ACTION_EVENT = 'before';
export const AFTER_ACTION_EVENT = 'after';

export interface IEventEmitter {
	on(eventName: string, callback: (action: any) => void): void;
	removeListener(eventName: string, callback: (action: any) => void): void;
}

export abstract class Assistant<S> {
	private prevState: Readonly<S>;
	private unsubscribes = new Set<Unsubscribe>();

	public [getStateSymbol]: () => Readonly<S>;
	public [dispatchSymbol]: { (action: any): void };
	public [subscribeSymbol]: (callback: () => void) => Unsubscribe;
	public [actionsEventEmitterSymbol]: IEventEmitter;
	public [onDestroySymbol]: () => void;

	protected onDestroy() {}

	protected onInit() {}

	public get state() {
		return this[getStateSymbol]();
	}

	protected onChange(callback: () => void) {
		return this.addUnsubscribe(
			this[subscribeSymbol](() => {
				if (this.prevState !== this.state) {
					callback();
				}
			})
		);
	}

	protected afterAction(
		type: string,
		callback: (action: any) => void
	): Unsubscribe;
	protected afterAction(callback: (action: any) => void): Unsubscribe;
	protected afterAction(
		type: string | ((action: any) => void),
		callback?: (action: any) => void
	) {
		const afterCallback = (action: any) => {
			if (typeof type === 'string') {
				if (action.type === type) {
					callback(action);
				}
				return;
			}
			type(action);
		};
		this[actionsEventEmitterSymbol].on(AFTER_ACTION_EVENT, afterCallback);
		return this.addUnsubscribe(() => {
			this[actionsEventEmitterSymbol].removeListener(
				AFTER_ACTION_EVENT,
				afterCallback
			);
		});
	}

	protected beforeAction(
		type: string,
		callback: (action: any) => void
	): Unsubscribe;
	protected beforeAction(callback: (action: any) => void): Unsubscribe;
	protected beforeAction(
		type: string | ((action: any) => void),
		callback?: (action: any) => void
	) {
		const beforeCallback = (action: any) => {
			if (typeof type === 'string') {
				if (action.type === type) {
					callback(action);
				}
				return;
			}
			type(action);
		};
		this[actionsEventEmitterSymbol].on(BEFORE_ACTION_EVENT, beforeCallback);

		return this.addUnsubscribe(() => {
			this[actionsEventEmitterSymbol].removeListener(
				BEFORE_ACTION_EVENT,
				beforeCallback
			);
		});
	}

	get dispatch() {
		return this[dispatchSymbol];
	}

	public [initSymbol]() {
		this.onInit();

		/**
		 * сохраняем state перед каждым action, чтобы проверить на изменения
		 */
		this.beforeAction(() => {
			this.prevState = this.state;
		});
	}

	private addUnsubscribe(unsubscribe: Unsubscribe) {
		const newUnsubscribe = () => {
			unsubscribe();
			this.unsubscribes.delete(newUnsubscribe);
		};
		this.unsubscribes.add(newUnsubscribe);
		return newUnsubscribe;
	}

	public destroy() {
		/** destroy children */
		this.assistants.forEach((assistant) => {
			assistant.destroy();
		});
		this.onDestroy();
		this.unsubscribes.forEach((unsubscribe) => unsubscribe());
		this[onDestroySymbol]();
	}

	private readonly assistants = new Set<Assistant<any>>();

	protected createAssistant<A extends Assistant<any>>(
		config: AssistantConfig<A, S>
	) {
		const newAssistant: A = createAssistant(
			config,
			() => this.state,
			this[dispatchSymbol],
			this[subscribeSymbol],
			this[actionsEventEmitterSymbol],
			() => {
				this.assistants.delete(newAssistant);
			}
		);
		this.assistants.add(newAssistant);
		return newAssistant;
	}
}

export type Configs<S> = Array<AssistantConfig<Assistant<any>, S>>;

export function ofStatePart<K extends string, A extends Assistant<any>>(
	select: K,
	config: { new (): A }
): AssistantConfig<A, { [P in K]: StateOfAssistant<A> }>;
export function ofStatePart<NewS, A extends Assistant<any>>(
	select: (s: NewS) => StateOfAssistant<A>,
	config: { new (): A }
): AssistantConfig<A, NewS>;
export function ofStatePart<
	K extends string,
	A extends Assistant<any>,
	S = StateOfAssistant<A>
>(
	select: K,
	config: ConstructorAssistantConfig<A, S> | CreateAssistantConfig<A, S>
): AssistantConfig<A, { [P in K]: S }>;
export function ofStatePart<
	NewS,
	A extends Assistant<any>,
	S = StateOfAssistant<A>
>(
	select: (s: NewS) => S,
	config: ConstructorAssistantConfig<A, S> | CreateAssistantConfig<A, S>
): AssistantConfig<A, NewS>;
export function ofStatePart<K extends string, S>(
	select: K,
	configs: Configs<S>
): Configs<{ [P in K]: S }>;
export function ofStatePart<NewS, S>(
	select: (s: NewS) => S,
	configs: Configs<S>
): Configs<NewS>;
/** Implementation */
export function ofStatePart(
	select: string | ((s: any) => any),
	config: AssistantConfig<any> | Array<AssistantConfig<any>>
): AssistantConfig<any> | Array<AssistantConfig<any>> {
	const innerSelect =
		typeof select === 'function' ? select : (s: any) => s[select];
	if (Array.isArray(config)) {
		return config.map((c) => innerAddSelect(innerSelect, c));
	}
	return innerAddSelect(innerSelect, config);
}

function innerAddSelect(
	select: (s: any) => any,
	config: AssistantConfig<any>
): CreateAssistantConfig<any> {
	const createConfig = getCreateConfig(config);
	return {
		create: createConfig.create,
		select: (s) => createConfig.select(select(s)),
	};
}

type StateOfAssistant<A extends Assistant<any>> = A extends Assistant<infer S>
	? S
	: never;

export type AssistantConfig<
	A extends Assistant<any>,
	S = StateOfAssistant<A>
> =
	| { new (): A }
	| ConstructorAssistantConfig<A, S>
	| CreateAssistantConfig<A, S>;

type ConstructorAssistantConfig<
	A extends Assistant<any>,
	S = StateOfAssistant<A>
> = {
	Constructor: { new (): A };
	select?: (s: S) => StateOfAssistant<A>;
};

type CreateAssistantConfig<
	A extends Assistant<any>,
	S = StateOfAssistant<A>
> = {
	create: () => A;
	select?: (s: S) => StateOfAssistant<A>;
};

function getCreateConfig<A extends Assistant<any>, S>(
	config: AssistantConfig<A, S>
): CreateAssistantConfig<A, S> {
	if (typeof config === 'function') {
		return {
			select: (s) => s as any,
			create: () => new config(),
		};
	}

	if (isConstructorConfig(config)) {
		return {
			select: config.select || ((s) => s as any),
			create: () => new config.Constructor(),
		};
	}

	if (isCreateConfig(config)) {
		return {
			create: config.create,
			select: config.select || ((s) => s as any),
		};
	}

	throw new Error('Incorrect assistant config');
}

function isConstructorConfig<A extends Assistant<any>, S>(
	config: AssistantConfig<A, S>
): config is ConstructorAssistantConfig<A, S> {
	return (
		typeof config === 'object' &&
		typeof (config as any).Constructor === 'function'
	);
}

function isCreateConfig<A extends Assistant<any>, S>(
	config: AssistantConfig<A, S>
): config is CreateAssistantConfig<A, S> {
	return (
		typeof config === 'object' &&
		typeof (config as any).create === 'function'
	);
}

export function createAssistant<A extends Assistant<any>, S>(
	config: AssistantConfig<A, S>,
	getState: () => S,
	dispatch: (action: any) => void,
	subscribe: (callback: () => void) => Unsubscribe,
	eventemitter: IEventEmitter,
	onDestroy = () => {}
) {
	const { create, select } = getCreateConfig(config);
	const assistant = create();

	assistant[getStateSymbol] = () => select(getState());
	assistant[dispatchSymbol] = dispatch;
	assistant[subscribeSymbol] = subscribe;
	assistant[actionsEventEmitterSymbol] = eventemitter;
	assistant[onDestroySymbol] = onDestroy;

	assistant[initSymbol]();

	return assistant;
}

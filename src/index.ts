const getStateSymbol = Symbol('getState');
const dispatchSymbol = Symbol('dispatch');
const actionsEventEmitterSymbol = Symbol('actionsEe');
const initSymbol = Symbol('init');
const onDestroySymbol = Symbol('onDestroy');

type Unsubscribe = () => void;

export type ActionEventName = 'before' | 'after' | 'change';

export interface IEventEmitter {
	on(eventName: ActionEventName, callback: (action?: any) => void): void;
	remove(eventName: ActionEventName, callback: (action?: any) => void): void;
}

type ActionCreator<R = any> = {
	(...args: any[]): R;
	type?: string;
};

type OnActionEvent = string | ActionCreator;

export abstract class Assistant<S> {
	private prevState: Readonly<any>;
	private unsubscribes = new Set<Unsubscribe>();

	public [getStateSymbol]: () => Readonly<S>;
	public [dispatchSymbol]: { (action: any): void };
	public [actionsEventEmitterSymbol]: IEventEmitter;
	public [onDestroySymbol]: () => void;

	protected onDestroy() {}

	protected onInit() {}

	public get state() {
		return this[getStateSymbol]();
	}

	protected onChange(callback: (prevState: S) => void) {
		const newCallback = () => {
			if (this.prevState !== this.state) {
				callback(this.prevState);
			}
		};
		this[actionsEventEmitterSymbol].on('change', newCallback);
		return this.addUnsubscribe(() => {
			this[actionsEventEmitterSymbol].remove('change', newCallback);
		});
	}

	protected afterAction(
		type: string,
		callback: (action: any) => void
	): Unsubscribe;
	protected afterAction<Action>(
		type: ActionCreator<Action>,
		callback: (action: Action) => void
	): Unsubscribe;
	protected afterAction(callback: (action: any) => void): Unsubscribe;
	protected afterAction(
		type: OnActionEvent,
		callback?: (action: any) => void
	) {
		const afterCallback = createOnActionCallback(type, callback);
		this[actionsEventEmitterSymbol].on('after', afterCallback);
		return this.addUnsubscribe(() => {
			this[actionsEventEmitterSymbol].remove('after', afterCallback);
		});
	}

	protected beforeAction(
		type: string,
		callback: (action: any) => void
	): Unsubscribe;
	protected beforeAction<Action>(
		type: ActionCreator<Action>,
		callback: (action: Action) => void
	): Unsubscribe;
	protected beforeAction(callback: (action: any) => void): Unsubscribe;
	protected beforeAction(
		type: OnActionEvent,
		callback?: (action: any) => void
	) {
		const beforeCallback = createOnActionCallback(type, callback);
		this[actionsEventEmitterSymbol].on('before', beforeCallback);

		return this.addUnsubscribe(() => {
			this[actionsEventEmitterSymbol].remove('before', beforeCallback);
		});
	}

	get dispatch() {
		return this[dispatchSymbol];
	}

	private initialized = false;

	public [initSymbol]() {
		if (this.initialized) {
			throw new Error('The assistant has been already initialized');
		}
		this.initialized = true;
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

	protected createAssistant<A extends Assistant<unknown>>(
		config: AssistantConfig<A, S>
	) {
		const { create, select } = getCreateConfig(config);
		const newAssistant: A = create();

		this.applyAssistant(newAssistant, select);

		return newAssistant;
	}

	protected applyAssistant(assistant: Assistant<S>): void;
	protected applyAssistant<K extends keyof S>(
		assistant: Assistant<S[K]>,
		key: K
	): void;
	protected applyAssistant<ChildS>(
		assistant: Assistant<ChildS>,
		select: (s: S) => ChildS
	): void;
	protected applyAssistant(
		newAssistant: Assistant<any>,
		selectParam: keyof S | ((s: S) => any) = (s) => s
	) {
		const select =
			typeof selectParam === 'function'
				? selectParam
				: (s: S) => s[selectParam];

		applyAssistant(
			newAssistant,
			() => select(this.state),
			this[dispatchSymbol],
			this[actionsEventEmitterSymbol],
			() => {
				this.assistants.delete(newAssistant);
			}
		);
		this.assistants.add(newAssistant);
	}
}

function createOnActionCallback(
	type: OnActionEvent,
	callback?: (action: any) => void
): (action: any) => void {
	if (typeof callback !== 'function') {
		return (action: any) => {
			(type as any)(action);
		};
	}

	let expectedType: string;

	if (typeof type === 'string') {
		expectedType = type;
	} else if (typeof type === 'function' && typeof type.type === 'string') {
		expectedType = type.type;
	} else if (typeof type === 'function') {
		expectedType = type.toString();
	}

	return (action: any) => {
		if (action.type === expectedType) {
			callback(action);
		}
	};
}

export function ofStatePart<NewS, S>(
	select: (s: NewS) => S,
	configs: Configs<S>
): Array<SelectCreateAssistantConfig<Assistant<unknown>, NewS>>;

export function ofStatePart<K extends string, S>(
	select: K,
	configs: Configs<S>
): Array<SelectCreateAssistantConfig<Assistant<unknown>, { [P in K]: S }>>;

export function ofStatePart<
	K extends string,
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
>(
	select: K,
	config:
		| SelectConstructorAssistantConfig<A, S>
		| SelectCreateAssistantConfig<A, S>
): SelectCreateAssistantConfig<A, { [P in K]: S }>;

export function ofStatePart<
	NewS,
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
>(
	select: (s: NewS) => S,
	config:
		| SelectConstructorAssistantConfig<A, S>
		| SelectCreateAssistantConfig<A, S>
): SelectCreateAssistantConfig<A, NewS>;

export function ofStatePart<K extends string, A extends Assistant<unknown>>(
	select: K,
	config:
		| { new (): A }
		| SimpleConstructorAssistantConfig<A, StateOfAssistant<A>>
		| SimpleCreateAssistantConfig<A>
): SelectCreateAssistantConfig<A, { [P in K]: StateOfAssistant<A> }>;

export function ofStatePart<NewS, A extends Assistant<unknown>>(
	select: (s: NewS) => StateOfAssistant<A>,
	config:
		| { new (): A }
		| SimpleConstructorAssistantConfig<A, StateOfAssistant<A>>
		| SimpleCreateAssistantConfig<A>
): SelectCreateAssistantConfig<A, NewS>;

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
		select: (s) => createConfig.select?.(select(s)),
	};
}

type StateOfAssistant<A extends Assistant<any>> = A extends Assistant<infer S>
	? S
	: never;

/** Порядок типов в перечислении важен. Не менять! */
export type Configs<S> = Array<
	| { new (): Assistant<S> }
	| SelectConstructorAssistantConfig<Assistant<unknown>, S>
	| SimpleConstructorAssistantConfig<Assistant<S>>
	| SelectCreateAssistantConfig<Assistant<unknown>, S>
	| SimpleCreateAssistantConfig<Assistant<S>>
>;

export type AssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> =
	| { new (): A & Assistant<S> }
	| SelectConstructorAssistantConfig<A, S>
	| SimpleConstructorAssistantConfig<A, S>
	| SelectCreateAssistantConfig<A, S>
	| SimpleCreateAssistantConfig<A, S>;

export type ConstructorAssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> =
	| SimpleConstructorAssistantConfig<A>
	| SelectConstructorAssistantConfig<A, S>;

export type SimpleConstructorAssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> = {
	Constructor: { new (): A & Assistant<S> };
};

export type SelectConstructorAssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> = SimpleConstructorAssistantConfig<A> & {
	select: (s: S) => StateOfAssistant<A>;
};

export type CreateAssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> = SimpleCreateAssistantConfig<A> | SelectCreateAssistantConfig<A, S>;

export type SimpleCreateAssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> = {
	create: () => A & Assistant<S>;
};

export type SelectCreateAssistantConfig<
	A extends Assistant<unknown>,
	S = StateOfAssistant<A>
> = SimpleCreateAssistantConfig<A> & {
	select: (s: S) => StateOfAssistant<A>;
};

function getCreateConfig<A extends Assistant<any>, S>(
	config: AssistantConfig<A, S>
): SelectCreateAssistantConfig<A, S> {
	if (typeof config === 'function') {
		return {
			select: (s) => s as any,
			create: () => new config(),
		};
	}

	if (isConstructorConfig(config)) {
		return {
			select:
				(config as SelectConstructorAssistantConfig<A, S>).select ||
				((s) => s as any),
			create: () => new config.Constructor(),
		};
	}

	if (isCreateConfig(config)) {
		return {
			create: config.create,
			select:
				(config as SelectCreateAssistantConfig<A, S>).select ||
				((s) => s as any),
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

export function createAssistant<A extends Assistant<unknown>, S>(
	config: AssistantConfig<A, S>,
	getState: () => S,
	dispatch: (action: any) => void,
	eventemitter: IEventEmitter,
	onDestroy = () => {}
) {
	const { create, select } = getCreateConfig(config);
	const assistant = create();

	applyAssistant(
		assistant,
		() => select(getState()) as any,
		dispatch,
		eventemitter,
		onDestroy
	);

	return assistant;
}

export function applyAssistant<S>(
	assistant: Assistant<S>,
	getState: () => S,
	dispatch: (action: any) => void,
	eventemitter: IEventEmitter,
	onDestroy = () => {}
) {
	assistant[getStateSymbol] = getState;
	assistant[dispatchSymbol] = dispatch;
	assistant[actionsEventEmitterSymbol] = eventemitter;
	assistant[onDestroySymbol] = onDestroy;

	assistant[initSymbol]();
}

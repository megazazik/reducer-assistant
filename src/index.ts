import { StoreEnhancer, StoreEnhancerStoreCreator } from 'redux';
import EventEmitter from 'eventemitter3';
// ------------------------------------------
import './tmp';
// ------------------------------------------

const getStateSymbol = Symbol('getState');
const dispatchSymbol = Symbol('dispatch');
const subscribeSymbol = Symbol('subscribe');
const actionsEventEmitterSymbol = Symbol('actionsEe');
const initSymbol = Symbol('init');
const onDestroySymbol = Symbol('onDestroy');

type Unsubscribe = () => void;

const BEFORE_ACTION_EVENT = 'before';
const AFTER_ACTION_EVENT = 'after';

export abstract class Assistant<S> {
	private prevState: Readonly<S>;
	private unsubscribes = new Set<Unsubscribe>();

	public [getStateSymbol]: () => Readonly<S>;
	public [dispatchSymbol]: { (action: any): void };
	public [subscribeSymbol]: (callback: () => void) => Unsubscribe;
	public [actionsEventEmitterSymbol]: EventEmitter;
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

	protected createAssistant<
		AssistantS = S,
		A extends Assistant<AssistantS> = Assistant<AssistantS>
	>(config: AssistantConfig<S, AssistantS, A>) {
		const newAssistant = createAssistant(
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

export type Configs<S> = Array<AssistantConfig<S, any, any>>;

export function addSelect<
	K extends string,
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
>(
	select: K,
	config: AssistantConfig<S, AssistantS, A>
): AssistantConfig<{ [P in K]: S }, AssistantS, A>;
export function addSelect<
	NewS,
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
>(
	select: (s: NewS) => S,
	config: AssistantConfig<S, AssistantS, A>
): AssistantConfig<NewS, AssistantS, A>;
export function addSelect<NewS, K extends keyof NewS>(
	select: K,
	configs: Array<AssistantConfig<NewS[K], any, any>>
): AssistantConfig<NewS, any, any>;
export function addSelect<NewS, S>(
	select: (s: NewS) => S,
	configs: Array<AssistantConfig<S, any, any>>
): AssistantConfig<NewS, any, any>;
export function addSelect(
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

export type AssistantConfig<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
> =
	| { new (): A }
	| ConstructorAssistantConfig<S, AssistantS, A>
	| CreateAssistantConfig<S, AssistantS, A>;

type ConstructorAssistantConfig<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
> = {
	Constructor: { new (): A };
	select: (s: S) => AssistantS;
};

type CreateAssistantConfig<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
> = {
	create(): A;
	select: (s: S) => AssistantS;
};

function getCreateConfig<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
>(
	config: AssistantConfig<S, AssistantS, A>
): CreateAssistantConfig<S, AssistantS, A> {
	if (typeof config === 'function') {
		return {
			select: (s) => s as any,
			create: () => new config(),
		};
	}

	if (isConstructorConfig(config)) {
		return {
			select: config.select,
			create: () => new config.Constructor(),
		};
	}

	if (isCreateConfig(config)) {
		return config;
	}

	throw new Error('Incorrect assistant config');
}

function isConstructorConfig<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
>(
	config: AssistantConfig<S, AssistantS, A>
): config is ConstructorAssistantConfig<S, AssistantS, A> {
	return (
		typeof config === 'object' &&
		typeof (config as any).Constructor === 'function'
	);
}

function isCreateConfig<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
>(
	config: AssistantConfig<S, AssistantS, A>
): config is ConstructorAssistantConfig<S, AssistantS, A> {
	return (
		typeof config === 'object' &&
		typeof (config as any).create === 'function'
	);
}

export const enhancer: <S>(
	assistantConfigs: Array<AssistantConfig<S, any, any>>
) => StoreEnhancer = (assistantConfigs) => (createStore) => {
	const newCreateStore: StoreEnhancerStoreCreator<{}, {}> = (
		reducer,
		preloadedState
	) => {
		const store = createStore<any, any>(reducer, preloadedState);
		const actionsEmitter = new EventEmitter();
		const dispatch = (action: any, ...args: any[]) => {
			actionsEmitter.emit(BEFORE_ACTION_EVENT, action);
			const result = (store.dispatch as any)(action, ...args);
			actionsEmitter.emit(AFTER_ACTION_EVENT, action);
			return result;
		};

		const enhancedStore = { ...store, dispatch };

		/** @todo доработать очистку помощников */
		assistantConfigs.forEach((config) => {
			createAssistant(
				config,
				() => enhancedStore.getState(),
				enhancedStore.dispatch,
				enhancedStore.subscribe,
				actionsEmitter
			);
		});
		return enhancedStore;
	};
	return newCreateStore;
};

function createAssistant<
	S,
	AssistantS = S,
	A extends Assistant<AssistantS> = Assistant<AssistantS>
>(
	config: AssistantConfig<S, AssistantS, A>,
	getState: () => S,
	dispatch: (action: any) => void,
	subscribe: (callback: () => void) => Unsubscribe,
	eventemitter: EventEmitter,
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

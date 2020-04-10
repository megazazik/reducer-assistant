import { StoreEnhancer, StoreEnhancerStoreCreator } from 'redux';
import { IModel, bindActionCreators } from 'encaps';
import EventEmitter from 'eventemitter3';
// ------------------------------------------
import './tmp';
// ------------------------------------------

const getStateSymbol = Symbol('getState');
const actionsSymbol = Symbol('actions');
const dispatchSymbol = Symbol('dispatch');
const subscribeSymbol = Symbol('subscribe');
const actionsEventEmitterSymbol = Symbol('actionsEe');
const initSymbol = Symbol('init');
const onDestroySymbol = Symbol('onDestroy');

const getDispatch = <A>(
	dispatch: (action: any) => void,
	actions: A
): { (action: any): void } & A =>
	Object.assign(
		(action: any) => dispatch(action),
		bindActionCreators(actions as any, dispatch)
	);

type Unsubscribe = () => void;

const BEFORE_ACTION_EVENT = 'before';
const AFTER_ACTION_EVENT = 'after';

export abstract class Assistant<M extends IModel<any, any>> {
	private prevState: Readonly<ReturnType<M['reducer']>>;
	private unsubscribes = new Set<Unsubscribe>();

	public [actionsSymbol]: M['actions'];
	public [getStateSymbol]: () => Readonly<ReturnType<M['reducer']>>;
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

	protected dispatch: {
		(action: any): void;
	} & M['actions'];

	public [initSymbol]() {
		this.dispatch = getDispatch(this[dispatchSymbol], this[actionsSymbol]);
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
		create: () => A,
		select = (state: any) => state
	): A {
		const newAssistant = createAssistant(
			create,
			select,
			() => this.state,
			this[dispatchSymbol],
			this[subscribeSymbol],
			this[actionsSymbol],
			this[actionsEventEmitterSymbol],
			() => {
				this.assistants.delete(newAssistant);
			}
		);
		this.assistants.add(newAssistant);
		return newAssistant;
	}
}

export interface IModule<
	M extends IModel<any, any>,
	Effects extends Array<{ new (): Assistant<M> }>
> {
	model: M;
	effects?: Effects;
	children?: Array<IModule<any, any>>;
}

export const createModule = <
	M extends IModel<any, any>,
	Effects extends Array<{ new (): Assistant<M> }>
>(
	module: IModule<M, Effects>
) => module;

export const enhancer: (
	module: IModule<IModel<any, any>, any[]>
) => StoreEnhancer = (module) => (createStore) => {
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
		module.effects.forEach((EffectConstructor) => {
			createAssistant(
				() => new EffectConstructor(),
				(state) => state,
				enhancedStore.getState,
				enhancedStore.dispatch,
				enhancedStore.subscribe,
				module.model.actions,
				actionsEmitter
			);
		});
		return enhancedStore;
	};
	return newCreateStore;
};

/** @todo дописать типы */
function createAssistant<A extends Assistant<any>>(
	assistantCreator: () => A,
	select: (state: any) => any,
	getState: () => any,
	dispatch: (action: any) => void,
	subscribe: (callback: () => void) => Unsubscribe,
	actions: any,
	eventemitter: EventEmitter,
	onDestroy = () => {}
) {
	const effect = assistantCreator();

	effect[actionsSymbol] = actions;
	effect[getStateSymbol] = () => select(getState());
	effect[dispatchSymbol] = dispatch;
	effect[subscribeSymbol] = subscribe;
	effect[actionsEventEmitterSymbol] = eventemitter;
	effect[onDestroySymbol] = onDestroy;

	effect[initSymbol]();

	return effect;
}

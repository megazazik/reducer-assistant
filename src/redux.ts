import { StoreEnhancer, StoreEnhancerStoreCreator } from 'redux';
import {
	Assistant,
	AssistantConfig,
	createAssistant,
	Configs,
	IEventEmitter,
	ActionEventName,
} from '.';

export type AssistantEnhancer<S> = StoreEnhancer & {
	applyAssistants(configs: Configs<S>): void;
};

class RootAssistant<S> extends Assistant<S> {
	childrens: Array<Assistant<any>> = [];

	applyAssistants(configs: Configs<S>) {
		this.childrens.forEach((child) => child.destroy());

		this.childrens = configs.map((config) => this.createAssistant(config));
	}
}

class EventEmitter implements IEventEmitter {
	listeners = {
		before: new Set<(action: any) => void>(),
		after: new Set<(action: any) => void>(),
	};

	on(eventName: ActionEventName, callback: (action: any) => void): void {
		this.listeners[eventName].add(callback);
	}

	remove(eventName: ActionEventName, callback: (action: any) => void): void {
		this.listeners[eventName].delete(callback);
	}

	emit(eventName: ActionEventName, action: any) {
		this.listeners[eventName].forEach((listener) => listener(action));
	}
}

export const createAssistantEnhancer = <S>() => {
	const config = createEnhancer(RootAssistant);
	const storeEnhancer: AssistantEnhancer<S> = config.enhancer as AssistantEnhancer<
		S
	>;

	storeEnhancer.applyAssistants = (configs) => {
		if (!config.rootAssistant) {
			throw new Error(
				'Could not apply assistants before state initialization'
			);
		}

		config.rootAssistant.applyAssistants(configs);
	};

	return storeEnhancer;
};

const createEnhancer: <S>(
	config: AssistantConfig<any, S>
) => {
	rootAssistant: RootAssistant<S>;
	enhancer: StoreEnhancer;
} = (config) => {
	const enhanceConfig: {
		rootAssistant: RootAssistant<any>;
		enhancer: StoreEnhancer;
	} = {
		rootAssistant: null,
		enhancer: (createStore) => {
			const newCreateStore: StoreEnhancerStoreCreator<{}, {}> = (
				reducer,
				preloadedState
			) => {
				const store = createStore<any, any>(reducer, preloadedState);
				const actionsEmitter = new EventEmitter();
				const dispatch = (action: any, ...args: any[]) => {
					actionsEmitter.emit('before', action);
					const result = (store.dispatch as any)(action, ...args);
					actionsEmitter.emit('after', action);
					return result;
				};

				const enhancedStore = { ...store, dispatch };

				enhanceConfig.rootAssistant = createAssistant(
					config,
					() => enhancedStore.getState(),
					enhancedStore.dispatch,
					enhancedStore.subscribe,
					actionsEmitter
				);

				return enhancedStore;
			};
			return newCreateStore;
		},
	};

	return enhanceConfig;
};

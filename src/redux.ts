import { StoreEnhancer, StoreEnhancerStoreCreator } from 'redux';
import {
	Assistant,
	AssistantConfig,
	createAssistant,
	BEFORE_ACTION_EVENT,
	AFTER_ACTION_EVENT,
	Configs,
} from '.';
import EventEmitter from 'eventemitter3';

export type AssistantEnhancer<S> = StoreEnhancer & {
	applyAssistants(configs: Configs<S>): void;
};

class RootAssistant<S> extends Assistant<S> {
	applyAssistants(configs: Configs<S>) {
		configs.forEach((config) => {
			this.createAssistant(config);
		});
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
					actionsEmitter.emit(BEFORE_ACTION_EVENT, action);
					const result = (store.dispatch as any)(action, ...args);
					actionsEmitter.emit(AFTER_ACTION_EVENT, action);
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

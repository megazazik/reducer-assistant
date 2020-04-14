import { Middleware } from 'redux';
import {
	Assistant,
	AssistantConfig,
	createAssistant,
	Configs,
	IEventEmitter,
	ActionEventName,
} from '.';

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
		change: new Set<(action?: any) => void>(),
	};

	on(eventName: ActionEventName, callback: (action: any) => void): void {
		this.listeners[eventName].add(callback);
	}

	remove(eventName: ActionEventName, callback: (action: any) => void): void {
		this.listeners[eventName].delete(callback);
	}

	emit(eventName: ActionEventName, action?: any) {
		this.listeners[eventName].forEach((listener) => listener(action));
	}
}

export type AssistantMiddleware<S> = Middleware & {
	applyAssistants(configs: Configs<S>): void;
};

export const createAssistantMiddleware = <S>() => {
	const config = createMiddleware(RootAssistant);
	const middleware: AssistantMiddleware<S> = config.middleware as AssistantMiddleware<
		S
	>;

	middleware.applyAssistants = (configs) => {
		if (!config.rootAssistant) {
			throw new Error(
				'Could not apply assistants before state initialization'
			);
		}

		config.rootAssistant.applyAssistants(configs);
	};

	return middleware;
};

const createMiddleware: <S>(
	config: AssistantConfig<any, S>
) => {
	rootAssistant: RootAssistant<S>;
	middleware: Middleware;
} = (config) => {
	const middlewareConfig: {
		rootAssistant: RootAssistant<any>;
		middleware: Middleware;
	} = {
		rootAssistant: null,
		middleware: ({ dispatch, getState }) => {
			const actionsEmitter = new EventEmitter();
			middlewareConfig.rootAssistant = createAssistant(
				config,
				getState,
				dispatch,
				actionsEmitter
			);

			return (next) => (action) => {
				const prevState = getState();
				actionsEmitter.emit('before', action);

				const result = next(action);

				if (prevState !== getState()) {
					actionsEmitter.emit('change');
				}
				actionsEmitter.emit('after', action);

				return result;
			};
		},
	};

	return middlewareConfig;
};

# reducer-assistant

[![npm version](https://badge.fury.io/js/reducer-assistant.svg)](https://badge.fury.io/js/reducer-assistant)

Library to manage side effects and async logic in applications using `redux` for state management. If you use `redux` but you don't like a complexity of sush solutions as `redux-saga` or `redux-observable`, you can manage your side effects with classes now.

-   [Getting started](#getting-started)
-   [Basic features (how to)](#basic-features-how-to)
    -   [Perform some operation when an assistant starts to work](#perform-some-operation-when-an-assistant-starts-to-work)
    -   [Subscribe to actions](#subscribe-to-actions)
    -   [Subscribe to state changes](#subscribe-to-state-changes)
    -   [Access to state](#access-to-state)
    -   [Dispatch actions](#dispatch-actions)
    -   [Connect assistants to a store](#connect-assistants-to-a-store)
    -   [Connect assistants to a store inside other assistants](#connect-assistants-to-a-store-inside-other-assistants)
    -   [Pass parameters to assistants](#pass-parameters-to-assistants)
    -   [Connect assistants to a part of a store](#connect-assistants-to-a-part-of-a-store)
    -   [Stop assistants and remove any subscription](#stop-assistants-and-remove-any-subscription)
-   [Assistant API](#assistant-api)
-   [Assistant config](#assistant-config)

## Getting started

_Assistants_ are managers of async effects for reducers. Inside an assistant you can fetch data, start timers or make any other async operations, you can subscribe to state changes and action dispatching. Also you can get a current state or dispatch an action during any async operation.

To start using assistants you should configure a redux store with an `AssistantsMiddleware`.

```typescript
import { createStore, applyMiddleware } from 'redux';
import { createAssistantMiddleware } from 'reducer-assistant/redux';

const assistantMiddleware = createAssistantMiddleware();

const store = createStore(reducer, applyMiddleware(assistantMiddleware));
```

Now you can create an assistant. This is an example of an assistant which starts fetching data after the `FETCH_START` action, and dispatches the `FETCH_SUCCESS` or `FETCH_ERROR` actions when the request is complete.

```typescript
import { Assistant } from 'reducer-assistant';

/**
 * To create an assistant you should create a class which extends a base Assistant class
 */
export class FetchDataAssistant extends Assistant {
	/**
	 * onInit runs when an assistant starts
	 *
	 * You can configure required listeners or dispatch some actions here
	 */
	onInit() {
		/** add 'FETCH_START' action listener */
		this.afterAction('FETCH_START', this.startFetch);
	}

	startFetch = async (action) => {
		try {
			const requestResult = await fetch(action.url, {
				/** you have access to the state from any method of assistant */
				...this.state.someData,
			});

			/** you can dispatch actions from any method of assistant */
			this.dispatch({ type: 'FETCH_SUCCESS', payload: requestResult });
		} catch (e) {
			this.dispatch({ type: 'FETCH_ERROR', payload: e });
		}
	};
}
```

Now you can connect the assistant to the store via a `applyAssistants` method of `AssistantMiddleware`.

```typescript
import { FetchDataAssistant } from './fetchDataAssistant';

...

assistantMiddleware.applyAssistants([FetchDataAssistant]);
```

After that a new `FetchDataAssistant` instance will be created and it will start to listen to the `FETCH_START` actions to make a request. Now you can dispatch the `FETCH_START` action anywhere in your application to fetch data.

```typescript
store.dispatch({ type: 'FETCH_START', url: 'https://github.com' });
```

## Basic features (How to)

### Perform some operation when an assistant starts to work

When an assistant instance is created, it is not completely ready to work yet. It should be connected to store first. So you must not use any methods of the base Assistant inside your assistant's constructor. Use them inside the `onInit` method or after it. It runs almost immediately after the constructor.

```js
class MyAssistant extends Assistant {
	constructor() {
		super();
		/** Do not use any base Assistant methods here */
	}

	onInit() {
		/** Here you can perform any operations */
	}
}
```

### Subscribe to actions

You can use `beforeAction` and `afterAction` methods to perform some operation when actions are dispatched.

```js
class MyAssistant extends Assistant {
	onInit() {
		/** Subscribe to any action */
		this.afterAction((action) => {
			console.log('action', action);
		});

		/** Subscribe to an action of type 'MY_ACTION' */
		this.afterAction('MY_ACTION', (action) => {
			console.log('action', action);
		});
	}
}
```

You can use an action creator function instead of a string as action type. In this case the action creator must have a `toString` method or contain a `type` field which return type of action as string.

```js
const createAction = () => ({ type: 'MY_ACTION' });

createAction.toString = () => 'MY_ACTION';
// or
createAction.type = 'MY_ACTION';

class MyAssistant extends Assistant {
	onInit() {
		this.afterAction(createAction, (action) => {
			console.log('action', action);
		});
	}
}
```

The `beforeAction` and `afterAction` methods return a function to unsubscribe these events.

### Subscribe to state changes

You can use `onChange` method to perform some operation when state is changed.

```js
class MyAssistant extends Assistant {
	onInit() {
		this.onChange((prevState) => {
			console.log('previous state', prevState);
			console.log('new state', this.state);
		});
	}
}
```

The `onChange` method returns a function to unsubscribe this event.

### Access to state

You have access to current state inside any method of assistant via the `state` getter. You can not use it before the `onInit` method call.

```js
class MyAssistant extends Assistant {
	onInit() {
		console.log('current state', this.state);
	}
}
```

### Dispatch actions

You dispatch any actions inside any method of assistant via the `dispatch` method. You can not use it before the `onInit` method call.

```js
class MyAssistant extends Assistant {
	onInit() {
		this.dispatch({ type: 'MY_ACTION' });
	}
}
```

### Connect assistants to a store

An assistant should be connected to a store to start to work. You can do it via `applyAssistants` method of an `AssistantMiddleware`. The `applyAssistants` method receives an array of assistant constructors or assistant configs (see [Assistant config](#assistant-config)).

```typescript
import { createStore, applyMiddleware } from 'redux';
import { createAssistantMiddleware } from 'reducer-assistant/redux';
import { Assistant } from 'reducer-assistant';

const assistantMiddleware = createAssistantMiddleware();

const store = createStore(reducer, applyMiddleware(assistantMiddleware));

class MyAssistant extends Assistant {
	/* ...*/
}

assistantMiddleware.applyAssistants([MyAssistant]);
```

You can invoke the `applyAssistants` method many times. All previous assistants will be destroyed.

### Connect assistants to a store inside other assistants

You can start some assistant inside another assistant via the `createAssistant` method.

```ts
class AnotherAssistant extends Assistant {
	/* ... */
}

class MyAssistant extends Assistant {
	onInit() {
		const anotherAssistantInstance = this.createAssistant(AnotherAssistant);
	}
}
```

### Pass parameters to assistants

Assistant configs passed to `applyAssistants` or `createAssistant` methods must not require any parameters. If they need some parameters, they should be configured before `applyAssistants` or `createAssistant` calls.

Consider some assistant requires the outer `url` parameter.

You can create a function which returns a new assistant class.

```ts
function createAssistant(url) {
	return class FetchAssistant extends Assistant {
		onInit() {
			fetch(url).then(/* ... */);
		}
	};
}

middleware.applyAssistants([createAssistant(url)]);
```

Or you can create an assistant with a parameter in constructor and a function which returns a `AssistantConfig` (see [Assistant config](#assistant-config)) configured with an url.

```ts
class FetchAssistant extends Assistant {
	constructor(url) {
		super();
		this.url = url;
	}

	/** ... */
}

function getAssistantConfig(url) {
	return {
		create: () => new FetchAssistant(url);
	}
}

middleware.applyAssistants([getAssistantConfig(url)]);
```

### Connect assistants to a part of a store

Usually reducers are responsible only for a part of a page state. If you write an assistant for such reducer, you would like the assistant to be responsible for the same part of the state.

Consider you have a timer reducer which returns a number. You can create an assistant which expect its state to be also a number.

```typescript
const timerReducer = (state: number, action): number => {
	/* ... */
};

class TimerAssistant extends Assistant<number> {}
```

Then you can set the `timerReducer` to work with a `timer` field of the page state.

```typescript
const rootReducer = combineReducers({
	/* ... */
	timer: timerReducer,
});
```

And you can set the `TimerAssistant` to work with a `timer` field of the page state to via the `ofStatePart` function. See [Assistant config](#assistant-config) for details.

```ts
import { ofStatePart } from 'reducer-assistant';

middleware.applyAssistants([ofStatePart('timer', TimerAssistant)]);
```

### Stop assistants and remove any subscription

If you need to stop an assistant for some reason you can use the `destroy` method of assistants.

```typescript
class MyAssistant extends Assistant {
	childAssistant = null;

	onInit() {
		this.childAssistant = this.createAssistant(ChildAssistant);

		this.afterAction('DESTROY', () => {
			/** destroy the current assistant instance */
			this.destroy();
		});

		this.afterAction('DESTROY_CHILD', () => {
			this.childAssistant.destroy();
		});
	}
}
```

When your assistant is being destroyed there is no need to unsubscribe to any base assistant events such as `afterAction`, `onChange` or destroy child assistants. But if you have subscribed to any extenral resource you should unsubscribe to them before your assistant is destroyed. You can do it inside the [onDestroy](#ondestroy) method.

## Assistant API

To create assistant you should create new class which extends base `Assistant` class.

```typescript
import { Assistant } from 'reducer-assistant';

class MyAssistant extends Assistant {}
```

`Assistant`'s constructor has no parameters. If you need any parameter you can create them.

```typescript
import { Assistant } from 'reducer-assistant';

class MyAssistant extends Assistant {
	constructor(params) {
		super();

		this.someValue = params.someValue;
	}
}
```

To find out how to pass parameters to assistant's constructor see [Assistant parameters](#assistant-parameters) section.

You CAN'T use any inherited methods or properties of base class in constructor. Use them inside `onInit` or after it.

The base `Assistant` class has the following method and properties:

-   [state](#state)
-   [dispatch](#dispatch)
-   [onInit](#oninit)
-   [onChange](#onchange)
-   [afterAction](#afteraction)
-   [beforeAction](#beforeaction)
-   [createAssistant](#createAssistant)
-   [destroy](#destroy)
-   [onDestroy](#ondestroy)

### state

The `state` getter returns a current state.

### dispatch

The `dispatch` dispatches an action.

### onInit

You can override this method to add listeners, dispatch action, start fetching data, start timers, create child assistants etc.

```typescript
class MyAssistant extends Assistant {
	onInit() {
		this.afterAction('SOME_ACTION', (action) => {
			console.log(action);
			console.log(state);
		});
	}
}
```

### onChange

Listeners passed to `onChange` will be invoked when the state has been changed after any action. An assistant can watch to changes of the whole state or some part of state. To see how to watch to a part of state see [Assistant config](#assistant-config) section. A function passed to `onChange` receives a previous state as a parameter.

```typescript
class MyAssistant extends Assistant {
	onInit() {
		this.onChange((prevState) => {
			console.log('previous state', prevState);
			console.log('new state', this.state);
		});
	}
}
```

The `onChange` method return a function to unsubscribe events.

```typescript
class MyAssistant extends Assistant {
	onInit() {
		/** add onChange listener */
		const unsubscribe = this.onChange(() => {
			console.log('new state action', this.state);
		});

		/** remove listener  */
		this.afterAction('UNSUBSCRIBE', () => {
			unsubscribe();
		});
	}
}
```

### afterAction

The `afterAction` listeners will be invoked when an action has been dispatched and the state has been changed. You can add listener to some specific action or to any action.

```typescript
class MyAssistant extends Assistant {
	onInit() {
		/** runs after any action */
		this.afterAction((action) => {
			/*...*/
		});
		/** runs after the 'ACTION1' action */
		this.afterAction('ACTION1', (action) => {
			/*...*/
		});
	}
}
```

An `afterAction` listener receives an action as a parameter.

The `afterAction` method return a function to unsubscribe events.

### beforeAction

The `beforeAction` method works as the `afterAction`. But its listeners will be invoked before state changes.

### createAssistant

You can run assistants dynamically from other assistants in any time inside and after `onInit` and before `onDestroy`. The `createAssistant` method receives an `AssistantConfig` and returns a created assistant instance.

```typescript
class MyAssistant extends Assistant {
	onInit() {
		this.createAssistant(ChildAssistant);
	}
}
```

### destroy

Via the `destroy` method you can stop an current assistant or a child assistant.

```typescript
class MyAssistant extends Assistant {
	childAssistant = null;

	onInit() {
		this.childAssistant = this.createAssistant(ChildAssistant);

		this.afterAction('DESTROY', () => {
			this.destroy();
		});

		this.afterAction('DESTROY_CHILD', () => {
			this.childAssistant.destroy();
		});
	}
}
```

### onDestroy

The `onDestroy` function is invoked before an assistant is destroyed. For example, if you add listeners to any events of DOM objects you can remove them in this method.

```typescript
class ClickAssistant extends Assistant {
	onInit() {
		document
			.getElementById('myDIV')
			.addEventListener('click', this.onClick);
	}

	onDestroy() {
		document
			.getElementById('myDIV')
			.removeEventListener('click', this.onClick);
	}

	onClick = () => {
		this.dispatch({ type: 'CLICK' });
	};
}
```

There is no need to remove listeners of the base assistant class events such as `onChange` or `afterAction` or destroy child assistants. They will be removed automatically.

## Assistant config

To create assistants you can use the `applyAssistants` method of a middleware or the `createAssistant` method of an assistant. They receives `AssistantConfig` values.

The simplified `AssistantConfig` type has the following form:

```ts
type AssistantConfig =
	| { new (): Assistant }
	| {
			Constructor: { new (): Assistant };
			select?: (fullstate: any) => any;
	  }
	| {
			create: () => Assistant;
			select?: (fullstate: any) => any;
	  };
```

### Constructor

The simplest version of `AssistantConfigs` is an assistant's constructor.

```ts
class MyAssistant extends Assustant {}

middleware.applyAssistants([MyAssistant]);
```

### Constructor with select

Sometimes you may need to create an assistant which manages some part of state. Such assistants can be reusable and independent of any other part of state.

```ts
type TimerState = {
	value: number;
};

class TimerAssistant extends Assistant<TimerState> {
	private intervalId;

	onInit() {
		this.intervalId = setInterval(() => {
			this.dispatch({ type: 'INCREMENT', payload: this.state.value + 1 });
		});
	}

	onDestroy() {
		clearInterval(this.intervalId);
	}
}
```

The `TimerAssistant` class expects the `state` property returns a value of type `{value: number}`. But state of a page reducer can be different and can contain the timer's value in any field;

```ts
type PageState = {
	timer: {value: number};
	....
}
```

When you create an assistant you can specify a part of state which will be managed by the assistant via `select` function of `AssistantConfig`.

```typescript
middleware.applyAssistants([
	{
		Constructor: TimerAssistant,
		/** select part of the PageState for TimerAssistant */
		select: (fullstate) => fullstate.timer,
	},
]); // instead of middleware.applyAssistants([TimerAssistant])
```

Now the `state` property of a `TimerAssistant`'s instance will return the `timer` field value of the page state. And listeners of the `onChange` event will be invoked only after the `timer` field changed.

#### select in child assistant config

When you create an assistant inside another assistant, the child assistant receives the parent state by default. You can pass an `AssistantConfig` with `select` function to the `createAssistant` method if you want the child assistant to manage some part of the parent state.

```typescript
class PageAssistant extends Assistant<PageState> {
	onInit() {
		this.createAssistant({
			Constructor: TimerAssistant,
			select: (fullstate) => fullstate.timer,
		}); // instead of this.createAssistant(TimerAssistant)
	}
}
```

#### ofStatePart

To simplify creation of `AssistantConfig` with `select` there is the `ofStatePart` function.

```ts
import { ofStatePart } from 'reducer-assistant';

/** all these calls are equal */

middleware.applyAssistants([
	{
		Constructor: TimerAssistant,
		/** select part of the PageState for TimerAssistant */
		select: (fullstate) => fullstate.timer,
	},
]);

middleware.applyAssistants([
	ofStatePart((fullstate) => fullstate.timer, TimerAssistant),
]);

middleware.applyAssistants([ofStatePart('timer', TimerAssistant)]);
```

The first parameter of the `ofStatePart` is a `select` function or a field name of a whole state. The second parameter is an `AssistantConfig`.

There is another version of the `ofStatePart`.
You can pass an array of configs to it. Then the `ofStatePart` returns an array too.

```ts
import { ofStatePart } from 'reducer-assistant';

middleware.applyAssistants(
	ofStatePart(
		(fullstate) => fullstate.timer,
		[Assistant1, Assistant2, ...]
	),
);

// or

middleware.applyAssistants(
	ofStatePart(
		'timer',
		[Assistant1, Assistant2, ...]
	)
);
```

The `ofStatePart` can be invoked many times.

```ts
ofStatePart(
	'field1',
	ofStatePart(
		'field2',
		ofStatePart(
			'timer',
			[Assistant1, Assistant2, ...]
		)
	)
)
```

### Assistant config with `create` function

Another form of `AssistantConfig` is the object with a `create` method instead of `Constructor`. A `create` method should return a new instance of `Assistant`. The following examples are equal.

```ts
middleware.applyAssistants([
	{
		Constructor: TimerAssistant,
		select: (fullstate) => fullstate.timer,
	},
]);

middleware.applyAssistants([
	{
		create: () => new TimerAssistant(),
		select: (fullstate) => fullstate.timer,
	},
]);
```

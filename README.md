# reducer-assistant

[![npm version](https://badge.fury.io/js/reducer-assistant.svg)](https://badge.fury.io/js/reducer-assistant)

Library to manage side effects and async logic in applications using `redux` for state management. If you use `redux` but you don't like a complexity of sush solutions as `redux-saga` or `redux-observable`, you can manage your side effects with classes now.

## Usage example

```typescript
import { Assistant } from 'reducer-assistant';

class FetchDataAssistant extends Assistant {
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

class IntervalAssistant extends Assistant {
	/** you can use any fields as in usual classes */
	intervalId = null;

	onInit() {
		/** add listener for 'INCREMENT_START' action */
		this.afterAction('INCREMENT_START', (action) => {
			this.intervalId = setInterval(this.incrementValue, action.timeout);
		});

		this.afterAction('INCREMENT_STOP', () => {
			clearInterval(this.intervalId);
		});
	}

	incrementValue = () => {
		/** increase value */
		this.dispatch({ type: 'SET_VALUE', value: this.state.value + 1 });
	};
}
```

## Configure redux store

The `createAssistantEnhancer` function is used to setup store to work with assistants. It create a store enhancer with an `applyAssistants` method which receives an array of assistant consctructors or `AssistanConfig` objects (see [Assistant config](#assistant-config) section).

```typescript
import { createStore } from 'redux';
import { createAssistantEnhancer } from 'reducer-assistant/redux';
import { assistants } from './assistants';

const assistantEnhancer = createAssistantEnhancer();

const store = createStore(reducer, assistantEnhancer);

assistantEnhancer.applyAssistants(assistants);
```

You can invoke the `applyAssistants` method many times. All previous assistants will be destroyed.

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

Listeners passed to `onChange` will be invoked when the state has changed after any action. An assistant can watch to changes of the whole state or some part of state. To see how to watch to a part of state see [Assistant config](#assistant-config) section.

```typescript
class MyAssistant extends Assistant {
	onInit() {
		this.onChange(() => {
			console.log('new state', this.state);
		});
	}
}
```

The `onChange` method return a function to unsubscribe events.

```typescript
class MyAssistant extends Assistant {
	unsubscribe = null;

	onInit() {
		/** add 'onChange' listener */
		this.afterAction('ACTION1', (action) => {
			this.unsubscribe = this.onChange(() => {
				console.log('new state action', this.state);
			});
		});
		/** remove listener  */
		this.afterAction('ACTION2', (action) => {
			this.unsubscribe();
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

To create assistants you can use the `applyAssistants` method of a store enhancer or the `createAssistant` method of an assistant. They receives `AssistantConfigs` values.

The simplified `AssistantConfigs` type has the following form:

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

enhancer.applyAssistants([MyAssistant]);
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
enhancer.applyAssistants([
	{
		Constructor: TimerAssistant,
		/** select part of the PageState for TimerAssistant */
		select: (fullstate) => fullstate.timer,
	},
]); // instead of enhancer.applyAssistants([TimerAssistant])
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

enhancer.applyAssistants([
	{
		Constructor: TimerAssistant,
		/** select part of the PageState for TimerAssistant */
		select: (fullstate) => fullstate.timer,
	},
]);

enhancer.applyAssistants([
	ofStatePart((fullstate) => fullstate.timer, TimerAssistant),
]);

enhancer.applyAssistants([ofStatePart('timer', TimerAssistant)]);
```

The first parameter of the `ofStatePart` is a `select` function or a field name of a whole state. The second parameter is an `AssistantConfig`.

There is another version of the `ofStatePart`.
You can pass an array of configs to it. Then the `ofStatePart` returns an array too.

```ts
import { ofStatePart } from 'reducer-assistant';

enhancer.applyAssistants(
	ofStatePart(
		(fullstate) => fullstate.timer,
		[Assistant1, Assistant2, ...]
	),
);

// or

enhancer.applyAssistants(
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
enhancer.applyAssistants([
	{
		Constructor: TimerAssistant,
		select: (fullstate) => fullstate.timer,
	},
]);

enhancer.applyAssistants([
	{
		create: () => new TimerAssistant(),
		select: (fullstate) => fullstate.timer,
	},
]);
```

## Assistant parameters

Assistant configs passed to `applyAssistants` or `createAssistant` methods must not require any parameters. If they need some parameters, they should be configured before `applyAssistants` or `createAssistant` calls.

Consider some assistant requires the `url` parameter.

```ts
class FetchAssistant extends Assistant {
	constructor(url) {
		super();
		this.url = url;
	}

	/** ... */
}
```

You can create a function which returns a `AssistantConfig` configured with an url.

```ts
function getAssistantConfig(url) {
	return class WithUrlFetchAssistant extends FetchAssistant {
		constructor() {
			super(url)
		}
	}
}

// or

function getAssistantConfig(url) {
	return {
		create: () => new FetchAssistant(url);
	}
}
```

And then can use this helper.

```ts
enhancer.applyAssistants([getAssistantConfig(url)]);
```

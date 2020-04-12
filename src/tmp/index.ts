import { createStore } from 'redux';
import { ofStatePart } from '..';
import { createAssistantEnhancer } from '../redux';
import { assistants } from './module3';
import { model } from './model';
import { ModelAssistant } from './assistant';

console.log('start');

const assistantEnhancer = createAssistantEnhancer<
	ReturnType<typeof model.reducer>
>();

const store = createStore(model.reducer, assistantEnhancer);

assistantEnhancer.applyAssistants([
	{ create: () => new ModelAssistant() },
	...ofStatePart('model3', assistants),
]);

console.log('state', store.getState());

// store.dispatch(model.actions.model3.model1.setValue(123));
// store.dispatch({ type: 'mytest' });

store.dispatch({ type: 'actionTmp' });

store.dispatch(model.actions.model3.model1.setValue(13));

store.dispatch({ type: 'remove' });

store.dispatch({ type: 'actionTmp' });

console.log('state', store.getState());

import { createStore } from 'redux';
import { enhancer, addSelect } from '..';
import { assistants } from './module3';
import { model } from './model';
import { ModelAssistant } from './assistant';

console.log('start');

addSelect('model3', assistants);

const store = createStore(
	model.reducer,
	enhancer<ReturnType<typeof model.reducer>>([
		ModelAssistant,
		...addSelect('model3', assistants),
	])
);

console.log('state', store.getState());

// store.dispatch(model.actions.model3.model1.setValue(123));
store.dispatch({ type: 'mytest' });

store.dispatch({ type: 'actionTmp' });

store.dispatch({ type: 'remove' });

store.dispatch({ type: 'actionTmp' });

console.log('state', store.getState());

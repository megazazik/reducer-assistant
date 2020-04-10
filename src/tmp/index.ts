import { createStore } from 'redux';
import { createModule, enhancer } from '..';
import module3 from './module3';
import { model } from './model';
import { ModelAssistant } from './assistant';

const module = createModule({
	model: model,
	children: [module3],
	effects: [ModelAssistant],
});

console.log('start');

const store = createStore(module.model.reducer, enhancer(module));

console.log('state', store.getState());

// store.dispatch(model.actions.model3.model1.setValue(123));
store.dispatch({ type: 'mytest' });

store.dispatch({ type: 'actionTmp' });

store.dispatch({ type: 'remove' });

store.dispatch({ type: 'actionTmp' });

console.log('state', store.getState());

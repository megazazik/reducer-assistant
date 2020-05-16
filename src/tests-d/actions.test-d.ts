import { expectType, expectError } from 'tsd';
import { Assistant } from '..';

class TestAssistant extends Assistant<unknown> {
	before = this.beforeAction;
	after = this.afterAction;
}

const myActionCreator = () => ({ type: 'myAction' as const, payload: 123 });

const assistant = new TestAssistant();

assistant.after(myActionCreator, (action) => {
	expectType<{ type: 'myAction'; payload: number }>(action);
});

assistant.after('myAction', (action) => {
	expectType<any>(action);
});

assistant.after('myAction', (action: { type: 'any' }) => {
	expectType<{ type: 'any' }>(action);
});

assistant.before(myActionCreator, (action) => {
	expectType<{ type: 'myAction'; payload: number }>(action);
});

assistant.before('myAction', (action) => {
	expectType<any>(action);
});

expectError(assistant.before(myActionCreator, (action: { type: 'any' }) => {}));

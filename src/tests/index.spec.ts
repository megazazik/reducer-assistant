import tape from 'tape';
import { createStore, applyMiddleware } from 'redux';
import { spy } from 'sinon';
import { Assistant } from '..';
import { createAssistantMiddleware } from '../redux';

tape('Before / after action calls', (t) => {
	const middleware = createAssistantMiddleware();
	const reducer = spy(() => ({}));
	const store = createStore(reducer, {}, applyMiddleware(middleware));

	const action = { type: 'action' };

	let assistant: TestAssistant;

	class TestAssistant extends Assistant<{}> {
		unsubscribeAll = () => {};

		onInit() {
			assistant = this;

			const unsubscribe1 = this.beforeAction(this.before1);
			const unsubscribe2 = this.beforeAction(this.before2);
			const unsubscribe3 = this.afterAction(this.after1);
			const unsubscribe4 = this.afterAction(this.after2);

			this.unsubscribeAll = () => {
				unsubscribe1();
				unsubscribe2();
				unsubscribe3();
				unsubscribe4();
			};
		}

		before1 = spy((a) => {
			t.equal(a, action);
			t.ok(this.after1.notCalled);
			t.ok(this.after2.notCalled);
			t.ok(reducer.calledOnce);
		});
		before2 = spy((a) => {
			t.equal(a, action);
			t.ok(this.after1.notCalled);
			t.ok(this.after2.notCalled);
			t.ok(reducer.calledOnce);
		});

		after1 = spy((a) => {
			t.equal(a, action);
			t.ok(this.before1.calledOnce);
			t.ok(this.before1.calledOnce);
			t.ok(reducer.calledTwice);
		});
		after2 = spy((a) => {
			t.equal(a, action);
			t.ok(this.before1.calledOnce);
			t.ok(this.before1.calledOnce);
			t.ok(reducer.calledTwice);
		});
	}

	middleware.applyAssistants([TestAssistant]);

	t.ok(reducer.calledOnce);

	store.dispatch(action);

	t.ok(reducer.calledTwice);

	assistant.unsubscribeAll();

	store.dispatch(action);

	t.ok(reducer.calledThrice);
	t.ok(assistant.before1.calledOnce);
	t.ok(assistant.before2.calledOnce);
	t.ok(assistant.after1.calledOnce);
	t.ok(assistant.after2.calledOnce);

	t.end();
});

tape('Before / after action with correct types', (t) => {
	const middleware = createAssistantMiddleware();
	const store = createStore(() => {}, applyMiddleware(middleware));

	let assistant: TestAssistant;

	const beforeToString = Object.assign(() => {}, {
		toString: () => 'beforeToString',
	});
	t.equal(beforeToString.toString(), 'beforeToString');

	const beforeType = Object.assign(() => {}, {
		type: 'beforeType',
	});
	t.equal(beforeType.type, 'beforeType');

	const afterToString = Object.assign(() => {}, {
		toString: () => 'afterToString',
	});
	t.equal(afterToString.toString(), 'afterToString');

	const afterType = Object.assign(() => {}, {
		type: 'afterType',
	});
	t.equal(afterType.type, 'afterType');

	class TestAssistant extends Assistant<{}> {
		onInit() {
			assistant = this;

			this.beforeAction(this.beforeAll);
			this.afterAction(this.afterAll);

			this.beforeAction('beforeStr', this.beforeStr);
			this.afterAction('afterStr', this.afterStr);

			this.beforeAction(beforeToString, this.beforeToString);
			this.afterAction(afterToString, this.afterToString);

			this.beforeAction(beforeType, this.beforeType);
			this.afterAction(afterType, this.afterType);
		}

		beforeAll = spy();
		afterAll = spy();

		beforeStr = spy((a) => {
			t.deepEqual(a, { type: 'beforeStr' });
		});
		beforeToString = spy((a) => {
			t.deepEqual(a, { type: 'beforeToString' });
		});
		beforeType = spy((a) => {
			t.deepEqual(a, { type: 'beforeType' });
		});

		afterStr = spy((a) => {
			t.deepEqual(a, { type: 'afterStr' });
		});
		afterToString = spy((a) => {
			t.deepEqual(a, { type: 'afterToString' });
		});
		afterType = spy((a) => {
			t.deepEqual(a, { type: 'afterType' });
		});
	}

	middleware.applyAssistants([TestAssistant]);

	store.dispatch({ type: 'noOne' });
	store.dispatch({ type: 'beforeStr' });
	store.dispatch({ type: 'beforeToString' });
	store.dispatch({ type: 'beforeType' });
	store.dispatch({ type: 'afterStr' });
	store.dispatch({ type: 'afterToString' });
	store.dispatch({ type: 'afterType' });

	t.equal(assistant.beforeAll.callCount, 7);
	t.equal(assistant.afterAll.callCount, 7);
	t.ok(assistant.beforeStr.calledOnce);
	t.ok(assistant.beforeToString.calledOnce);
	t.ok(assistant.beforeType.calledOnce);
	t.ok(assistant.afterStr.calledOnce);
	t.ok(assistant.afterToString.calledOnce);
	t.ok(assistant.afterType.calledOnce);

	t.end();
});

tape('On change', (t) => {
	const reducer = (state = { v1: 0, v2: '' }, { type }: { type: string }) =>
		type === 'myaction'
			? {
					...state,
					v1: state.v1 + 1,
			  }
			: state;

	const middleware = createAssistantMiddleware<ReturnType<typeof reducer>>();

	const store = createStore(reducer, applyMiddleware(middleware));

	class TestAssistant<S> extends Assistant<S> {
		constructor(private onChangeParam: (s: any, prevState: S) => void) {
			super();
		}

		onInit() {
			this.onChange((prevState) =>
				this.onChangeParam(this.state, prevState)
			);
		}
	}

	const onChaneFull = spy((s: any, p: any) => {});
	const onChaneV1 = spy((s: any, p: any) => {});
	const onChaneV2 = spy((s: any, p: any) => {});

	middleware.applyAssistants([
		{
			create: () =>
				new TestAssistant<ReturnType<typeof reducer>>(onChaneFull),
		},
		{
			create: () => new TestAssistant(onChaneV1),
			select: (s) => s.v1,
		},
		{
			create: () => new TestAssistant(onChaneV2),
			select: (s) => s.v2,
		},
	]);

	t.ok(onChaneFull.notCalled);
	t.ok(onChaneV1.notCalled);
	t.ok(onChaneV2.notCalled);

	store.dispatch({ type: 'myaction' });

	t.ok(onChaneFull.calledOnce);
	t.deepEqual(onChaneFull.args[0][0], { v1: 1, v2: '' });
	t.deepEqual(onChaneFull.args[0][1], { v1: 0, v2: '' });
	t.ok(onChaneV1.calledOnce);
	t.deepEqual(onChaneV1.args[0][0], 1);
	t.deepEqual(onChaneV1.args[0][1], 0);
	t.ok(onChaneV2.notCalled);

	store.dispatch({ type: 'myaction' });

	t.ok(onChaneFull.calledTwice);
	t.deepEqual(onChaneFull.args[1][0], { v1: 2, v2: '' });
	t.deepEqual(onChaneFull.args[1][1], { v1: 1, v2: '' });
	t.ok(onChaneV1.calledTwice);
	t.deepEqual(onChaneV1.args[1][0], 2);
	t.deepEqual(onChaneV1.args[1][1], 1);
	t.ok(onChaneV2.notCalled);

	t.end();
});

import { expectType, expectError } from 'tsd';
import {
	ofStatePart,
	Assistant,
	SelectCreateAssistantConfig,
	Configs,
} from '..';

class Test1Assistant extends Assistant<number> {}
class Test2Assistant extends Assistant<string> {}

expectType<Test1Assistant>(new Test1Assistant());

// Constructor as config
expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: number }>>(
	ofStatePart('f1', Test1Assistant)
);

expectType<SelectCreateAssistantConfig<Test2Assistant, { f1: string }>>(
	ofStatePart('f1', Test2Assistant)
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f5: number }>>(
	ofStatePart((s: { f5: number }) => s.f5, Test1Assistant)
);

expectError(ofStatePart((s: { f5: string }) => s.f5, Test1Assistant));

// Object with Constructor as config
expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: number }>>(
	ofStatePart('f1', { Constructor: Test1Assistant })
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: { f2: number } }>>(
	ofStatePart('f1', {
		Constructor: Test1Assistant,
		select: (s: { f2: number }) => s.f2,
	})
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f5: number }>>(
	ofStatePart((s: { f5: number }) => s.f5, { Constructor: Test1Assistant })
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f5: { f2: number } }>>(
	ofStatePart((s: { f5: { f2: number } }) => s.f5, {
		Constructor: Test1Assistant,
		select: (s: { f2: number }) => s.f2,
	})
);

expectError(
	ofStatePart((s: { f5: string }) => s.f5, { Constructor: Test1Assistant })
);

expectError(
	ofStatePart((s: { f5: { f2: string } }) => s.f5, {
		Constructor: Test1Assistant,
		select: (s: { f2: number }) => s.f2,
	})
);

// Object with create as config
expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: number }>>(
	ofStatePart('f1', { create: () => new Test1Assistant() })
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: { f2: number } }>>(
	ofStatePart('f1', {
		create: () => new Test1Assistant(),
		select: (s: { f2: number }) => s.f2,
	})
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: number }>>(
	ofStatePart((s: { f1: number }) => s.f1, {
		create: () => new Test1Assistant(),
	})
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f1: { f2: number } }>>(
	ofStatePart((s: { f1: { f2: number } }) => s.f1, {
		create: () => new Test1Assistant(),
		select: (s: { f2: number }) => s.f2,
	})
);

expectError(
	ofStatePart((s: { f1: string }) => s.f1, {
		create: () => new Test1Assistant(),
	})
);

expectError(
	ofStatePart((s: { f1: { f2: string } }) => s.f1, {
		create: () => new Test1Assistant(),
		select: (s: { f2: number }) => s.f2,
	})
);

// double ofStatePart call
expectType<SelectCreateAssistantConfig<Test1Assistant, { f2: { f1: number } }>>(
	ofStatePart('f2', ofStatePart('f1', Test1Assistant))
);

expectType<SelectCreateAssistantConfig<Test1Assistant, { f2: { f1: number } }>>(
	ofStatePart(
		(s: { f2: { f1: number } }) => s.f2,
		ofStatePart('f1', Test1Assistant)
	)
);

expectError(
	ofStatePart(
		(s: { f2: { f1: string } }) => s.f2,
		ofStatePart('f1', Test1Assistant)
	)
);

// Arrays

class Test3Assistant extends Assistant<{ f1: number }> {}

// Pass string as select
expectType<
	Array<SelectCreateAssistantConfig<Assistant<unknown>, { f1: number }>>
>(ofStatePart('f1', [Test1Assistant]));

expectType<
	Array<SelectCreateAssistantConfig<Assistant<unknown>, { f1: number }>>
>(ofStatePart('f1', [{ Constructor: Test1Assistant }]));

expectType<
	Array<SelectCreateAssistantConfig<Assistant<unknown>, { f1: number }>>
>(ofStatePart('f1', [Test1Assistant, { Constructor: Test1Assistant }]));

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(ofStatePart('f2', [ofStatePart('f1', Test1Assistant)]));

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(
	ofStatePart('f2', [
		{ Constructor: Test1Assistant, select: (s: { f1: number }) => s.f1 },
	])
);

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(ofStatePart('f2', [Test3Assistant]));

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(
	ofStatePart('f2', [
		ofStatePart('f1', Test1Assistant),
		Test3Assistant,
		{ Constructor: Test1Assistant, select: (s: { f1: number }) => s.f1 },
	])
);

// Pass function as select
expectType<
	Array<SelectCreateAssistantConfig<Assistant<unknown>, { f1: number }>>
>(ofStatePart((s: { f1: number }) => s.f1, [Test1Assistant]));

expectType<
	Array<SelectCreateAssistantConfig<Assistant<unknown>, { f1: number }>>
>(ofStatePart((s: { f1: number }) => s.f1, [{ Constructor: Test1Assistant }]));

expectType<
	Array<SelectCreateAssistantConfig<Assistant<unknown>, { f1: number }>>
>(
	ofStatePart((s: { f1: number }) => s.f1, [
		Test1Assistant,
		{ Constructor: Test1Assistant },
	])
);

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		ofStatePart('f1', Test1Assistant),
	])
);

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		{ Constructor: Test1Assistant, select: (s: { f1: number }) => s.f1 },
	])
);

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(ofStatePart((s: { f2: { f1: number } }) => s.f2, [Test3Assistant]));

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		ofStatePart('f1', Test1Assistant),
		Test3Assistant,
		{ Constructor: Test1Assistant, select: (s: { f1: number }) => s.f1 },
	])
);

// Errors
expectError(ofStatePart((s: { f2: { f1: number } }) => s.f2, [Test1Assistant]));

expectError(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		{ Constructor: Test1Assistant, select: (s: { f3: number }) => s.f3 },
	])
);

expectError(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		{
			create: () => new Test1Assistant(),
			select: (s: { f3: number }) => s.f3,
		},
	])
);

expectError(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		{ Constructor: Test1Assistant },
	])
);

expectError(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		ofStatePart('f3', Test1Assistant),
	])
);

// nested ofStatePart
expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f3: { f1: number } }>
	>
>(
	ofStatePart('f3', [
		...ofStatePart('f1', [Test1Assistant, { Constructor: Test1Assistant }]),
		Test3Assistant,
	])
);

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(
	ofStatePart((s: { f2: { f1: number } }) => s.f2, [
		...ofStatePart('f1', [Test1Assistant, { Constructor: Test1Assistant }]),
		Test3Assistant,
	])
);

const assistants: Configs<{ f1: number }> = [
	...ofStatePart('f1', [Test1Assistant, { Constructor: Test1Assistant }]),
	Test3Assistant,
];

expectType<
	Array<
		SelectCreateAssistantConfig<Assistant<unknown>, { f2: { f1: number } }>
	>
>(ofStatePart((s: { f2: { f1: number } }) => s.f2, assistants));

// createAssistant method
class CreateAssistantTest1 extends Assistant<number> {
	public createAss = this.createAssistant;
}

class CreateAssistantTest2 extends Assistant<{ f1: number }> {
	public createAss = this.createAssistant;
}

const createAssistantTest1 = new CreateAssistantTest1();
const createAssistantTest2 = new CreateAssistantTest2();

expectType<Test1Assistant>(createAssistantTest1.createAss(Test1Assistant));
expectType<Test1Assistant>(
	createAssistantTest1.createAss({ Constructor: Test1Assistant })
);
expectType<Test1Assistant>(
	createAssistantTest1.createAss({ create: () => new Test1Assistant() })
);

expectError(createAssistantTest2.createAss(Test1Assistant));
expectError(createAssistantTest2.createAss({ Constructor: Test1Assistant }));

expectType<Test1Assistant>(
	createAssistantTest2.createAss({
		create: () => new Test1Assistant(),
		select: (s: { f1: number }) => s.f1,
	})
);

expectError(
	createAssistantTest2.createAss({
		create: () => new Test1Assistant(),
		select: (s: { f2: number }) => s.f2,
	})
);

expectType<Test1Assistant>(
	createAssistantTest2.createAss({
		Constructor: Test1Assistant,
		select: (s: { f1: number }) => s.f1,
	})
);

expectError(
	createAssistantTest2.createAss({
		Constructor: Test1Assistant,
		select: (s: { f2: number }) => s.f2,
	})
);

expectType<Test1Assistant>(
	createAssistantTest2.createAss(ofStatePart('f1', Test1Assistant))
);

expectError(createAssistantTest2.createAss(ofStatePart('f2', Test1Assistant)));

import { ofStatePart, Configs, AssistantConfig } from '../..';
import { model3, State3 } from './model';
import { Model3Assistant } from './assistant';
import { Model1Assistant } from '../module1';
import { Model2Assistant } from '../module2';

export { model3 };

export const assistants: Configs<State3> = [
	Model3Assistant,
	ofStatePart('model1', { create: () => new Model1Assistant() }),
	ofStatePart('model2', Model2Assistant),
];

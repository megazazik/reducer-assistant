import { model } from './model';
import { Assistant } from '..';

export class ModelAssistant extends Assistant<typeof model> {
	private tmp: Temp;

	onInit() {
		this.afterAction('mytest', () => {
			// this.dispatch({ type: 'model3.model1.setValue', payload: 876 });
			this.tmp = this.createAssistant(() => new Temp());
		});

		this.afterAction('remove', () => {
			this.tmp?.destroy();
		});
	}
}

class Temp extends Assistant<typeof model> {
	onInit() {
		this.beforeAction((action) => {
			console.log('before action', action);
			console.log('before state', this.state);
		});
		this.afterAction((action) => {
			console.log('after action', action);
			console.log('after state', this.state);
		});
	}
}

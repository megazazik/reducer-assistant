import { model1 } from './model';
import { Assistant } from '../..';

export class Model1Assistant extends Assistant<
	ReturnType<typeof model1.reducer>
> {
	onInit() {
		this.onChange(() => {
			console.log('Model 1 onchange');
		});
	}
}
